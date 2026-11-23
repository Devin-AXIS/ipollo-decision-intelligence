/** Public service methods used by this bundle, supplied by iPolloWork at runtime. */
type Field = string | number;
export type DataRecord = Record<string,Field> & {id:string;version:number};
type Query = {sort?:string;where?:Record<string,Field>;fields?:string[];limit?:number};
export type DataStatement =
  | {define:string;fields:Record<string,'text'|'number'>;strict:boolean;public:never[];users:never[]}
  | {insert:string;values:Record<string,Field>[]}
  | {update:string;id:string;version:number;set:Record<string,Field>};
interface Collection {
  get(id:string):Promise<DataRecord>;
  insert(values:Record<string,Field>):Promise<DataRecord>;
  update(id:string,values:Record<string,Field>,version:number):Promise<DataRecord>;
  find(query:Query):Promise<{items:DataRecord[]}>;
  all(query:Query):Promise<DataRecord[]>;
}
export interface DataApp {
  id:string;
  run(input:{batch: DataStatement[]}):Promise<unknown>;
  collection(name:string):Collection;
  files?: {
    upload(name:string,bytes:Uint8Array,options:{mime:string}):Promise<{id:string}>;
    download(id:string):Promise<{url:string}>;
  };
}
export interface IpolloData {open(name:string):Promise<DataApp>}
export interface ServiceBinding {
  publicationStatus?():Promise<boolean>;
  publish?(input:{workspaceId:string;entry:string;files:{path:string;bytes:number;open():ReadableStream<Uint8Array>}[]}):Promise<{url:string}>;
}
export interface ServiceCenter {bind(signal?:AbortSignal):Promise<ServiceBinding>}
