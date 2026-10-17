/** Local services expose useful errors without leaking provider or storage credentials. */
export async function api<T=unknown>(path:string, init?:RequestInit):Promise<T>{
 const response=await fetch(path,{...init,headers:{...(init?.body instanceof FormData?{}:{'content-type':'application/json'}),...init?.headers}});
 const data=await response.json().catch(()=>({detail:'The service did not return a valid response.'}));
 if(!response.ok)throw Error(typeof data.detail==='string'?data.detail:data.error??'The request failed. Please retry.');
 return data as T;
}
export const post=<T=unknown>(path:string,body:unknown)=>api<T>(path,{method:'POST',body:JSON.stringify(body)});
