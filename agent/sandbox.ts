import { Daytona, type Sandbox } from "@daytonaio/sdk";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, relative, dirname } from "node:path";
import { existsSync } from "node:fs";
import type { ToolConfig } from "../shared/domain";

const WORK = "/home/daytona/sportsbuilder";
const quote = (s: string) => `'${s.replaceAll("'", "'\\''")}'`;
const browserScript = String.raw`import asyncio,json,os,traceback
from playwright.async_api import async_playwright
async def main():
    request=json.load(open('${WORK}/browser-request.json'))
    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,args=['--no-sandbox'])
        page=await browser.new_page(viewport=request.get('viewport',{'width':1440,'height':1000}),device_scale_factor=1)
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        await page.goto(request['url'],wait_until='networkidle',timeout=45000)
        await page.wait_for_timeout(900)
        if request.get('script'):
            namespace={'page':page,'asyncio':asyncio}
            exec('async def action(page):\n'+''.join('    '+line+'\n' for line in request['script'].splitlines()),namespace)
            await namespace['action'](page)
        await page.screenshot(path='${WORK}/preview.png',full_page=True)
        print(json.dumps({'title':await page.title(),'text':(await page.locator('body').inner_text())[:14000],'errors':errors}))
        await browser.close()
asyncio.run(main())
`;
export class BuildSandbox {
  private sandbox?: Sandbox;
  private active?: ToolConfig;
  constructor(
    private jobId: string,
    private stage: (text: string) => void,
  ) {}
  async start() {
    if (!process.env.DAYTONA_API_KEY)
      throw Error(
        "Set DAYTONA_API_KEY to create the required browser review environment.",
      );
    if (!existsSync("Web/dist/index.html"))
      throw Error(
        "Build the frontend with bun run build before creating a coaching tool.",
      );
    this.stage("Preparing a private review environment");
    const client = new Daytona({
      apiKey: process.env.DAYTONA_API_KEY,
      requestTimeoutMs: 180000,
    });
    this.sandbox = await client.create(
      {
        language: "python",
        autoStopInterval: 10,
        autoDeleteInterval: 0,
        ttlMinutes: 20,
        ephemeral: true,
        labels: { app: "sportsbuilder", job: this.jobId },
      },
      { timeout: 180 },
    );
    await this.sandbox.process.executeCommand(
      `mkdir -p ${WORK}/app`,
      undefined,
      undefined,
      30,
    );
    const files: { source: Buffer; destination: string }[] = [];
    const walk = async (dir: string): Promise<void> => {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = resolve(dir, entry.name);
        if (entry.isDirectory()) await walk(path);
        else
          files.push({
            source: await readFile(path),
            destination: `${WORK}/app/${relative(resolve("Web/dist"), path)}`,
          });
      }
    };
    await walk(resolve("Web/dist"));
    const folders = new Set(files.map((f) => dirname(f.destination)));
    await this.run(`mkdir -p ${[...folders].map(quote).join(" ")}`, 30);
    await this.sandbox.fs.uploadFiles(files, 90);
    await this.sandbox.fs.uploadFile(
      Buffer.from(browserScript),
      `${WORK}/browser.py`,
    );
    const setup = await this.run('python3 -c "import playwright"', 20);
    if (setup.exitCode !== 0) {
      this.stage("Installing the browser review tools");
      const install = await this.run(
        "python3 -m pip install --quiet playwright",
        120,
      );
      if (install.exitCode !== 0)
        throw Error(
          "The browser review tools could not be installed in Daytona.",
        );
    }
    const browserCheck = await this.run(
      `python3 -c ${quote("from playwright.sync_api import sync_playwright; p=sync_playwright().start(); b=p.chromium.launch(headless=True,args=['--no-sandbox']); b.close(); p.stop()")}`,
      30,
    );
    if (browserCheck.exitCode !== 0) {
      const install = await this.run(
        "python3 -m playwright install chromium --with-deps > /tmp/sportsbuilder-browser-install.log 2>&1",
        180,
      );
      if (install.exitCode !== 0)
        throw Error(
          "Chromium could not be prepared in Daytona. Please retry the build.",
        );
    }
    const server = await this.run(
      `cd ${WORK}/app && python3 -m http.server 5173 --bind 127.0.0.1 > /tmp/sportsbuilder-preview.log 2>&1 < /dev/null &`,
      15,
    );
    if (server.exitCode !== 0)
      throw Error("The app preview server could not start.");
  }
  private get instance() {
    if (!this.sandbox) throw Error("The review environment is not ready.");
    return this.sandbox;
  }
  async run(command: string, seconds = 30) {
    return this.instance.process.executeCommand(
      command,
      WORK,
      undefined,
      seconds,
    );
  }
  path(path: string) {
    if (!path || path.includes("\0"))
      throw Error("Use a valid relative workspace path.");
    const full = resolve(WORK, path);
    if (full !== WORK && !full.startsWith(WORK + "/"))
      throw Error("Files must stay within the build workspace.");
    return full;
  }
  async read(path: string) {
    const data = await this.instance.fs.downloadFile(this.path(path));
    if (data.length > 150000)
      throw Error("This file is too large to read as text.");
    return data.toString();
  }
  async write(path: string, content: string) {
    if (content.length > 150000) throw Error("This file is too large.");
    const full = this.path(path);
    await this.run(`mkdir -p ${quote(dirname(full))}`);
    await this.instance.fs.uploadFile(Buffer.from(content), full);
    return { written: path };
  }
  setDraft(tool: ToolConfig) {
    this.active = tool;
  }
  async browse(script = "", mobile = false) {
    if (!this.active)
      throw Error("Validate a tool draft first so the browser can preview it.");
    const { referenceId, ...preview } = this.active;
    const url = `http://127.0.0.1:5173/?preview=${Buffer.from(JSON.stringify(preview)).toString("base64url")}`;
    await this.instance.fs.uploadFile(
      Buffer.from(
        JSON.stringify({
          url,
          script,
          viewport: mobile
            ? { width: 390, height: 844 }
            : { width: 1440, height: 1000 },
        }),
      ),
      `${WORK}/browser-request.json`,
    );
    const result = await this.run(`python3 ${WORK}/browser.py`, 75);
    if (result.exitCode !== 0)
      throw Error(`Browser inspection failed: ${result.result.slice(-1800)}`);
    const lines = result.result.trim().split("\n");
    let info: { title: string; text: string; errors: string[] };
    try {
      info = JSON.parse(lines[lines.length - 1]);
    } catch {
      throw Error("Browser inspection returned no readable result.");
    }
    const pixels = await this.instance.fs.downloadFile(`${WORK}/preview.png`);
    if (pixels.length < 1000)
      throw Error("The browser returned an empty screenshot.");
    await mkdir(`output/builds/${this.jobId}`, { recursive: true });
    const filename = mobile ? "mobile.png" : "desktop.png";
    await writeFile(`output/builds/${this.jobId}/${filename}`, pixels);
    return {
      ...info,
      screenshot: `data:image/png;base64,${pixels.toString("base64")}`,
    };
  }
  async close() {
    const sandbox = this.sandbox;
    this.sandbox = undefined;
    if (sandbox)
      await sandbox.delete(45).catch(() => {
        console.error(
          "A build sandbox could not be deleted; its automatic cleanup is still enabled.",
        );
      });
  }
}
