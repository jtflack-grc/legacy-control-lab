export type JevQuestion =
  | {type:"noul";instructions:string;criteria:{true:string;false:string}}
  | {type:"choice";instructions:string;criteria:Record<string,string>}
  | {type:"score";instructions:string;criteria:string[]};

export type JevAnswer =
  | {type:"noul";noul:number}
  | {type:"choice";choice:string;confidence:number;probabilities:Record<string,number>}
  | {type:"score";score:number;confidence:number;legend:Record<string,string>;probabilities:Record<string,number>};

export type JevRequest={model:string;state:Record<string,unknown>;questions:Record<string,JevQuestion>};
export type JevResponse={model:string;answers:Record<string,JevAnswer>;usage:{input_tokens:number;output_tokens:number}};

export type StatePackage={
  id:string;
  title:string;
  boundary:string;
  knownExclusions:string[];
  state:Record<string,unknown>;
};

export type JevRun={
  stateId:string;
  stateTitle:string;
  boundary:string;
  knownExclusions:string[];
  request:JevRequest;
  response:JevResponse;
  requestHash:string;
  responseHash:string;
  elapsedMs:number;
};

export type JevAssurancePackage={
  schema:"lcl-jev-assurance-package/v1";
  generatedAt:string;
  mode:"live"|"fixture";
  provider:string;
  modelRequested:string;
  source:{repository:string;commit:string;workflowRunId:string};
  subject:{system:string;user:string;object:string;businessRole:string};
  invariant:string;
  questions:Record<string,JevQuestion>;
  runs:JevRun[];
  comparison:{fromState:string;toState:string;metrics:Record<string,{from:string|number;to:string|number;delta?:number}>}[];
  integrity:{packageHash:string};
  limitations:string[];
};
