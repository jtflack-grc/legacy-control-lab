export type ScfAssessmentStatus="pass"|"fail"|"partial"|"not_tested"|"no_evidence";
export type ScfImplementationFit="like_for_like"|"partial"|"not_demonstrated";

export type ScfEvidenceReference={
  type:"scenario"|"proposal"|"proof_bundle"|"receipt_chain"|"service_identity"|"scope";
  id:string;
  label:string;
  href?:string;
};

export type ScfAssessmentRow={
  controlId:string;
  controlTitle:string;
  scfIntent:string;
  assessorQuestion:string;
  lclImplementation:string;
  fit:ScfImplementationFit;
  status:ScfAssessmentStatus;
  conclusion:string;
  gap:string|null;
  scenarios:string[];
  evidence:ScfEvidenceReference[];
};

export type ScfAssessment={
  profile:{id:string;title:string;scfRelease:string;kind:"assessor_guidepost";claim:string};
  boundary:{system:string;environment:string;target:string;interval:string;limitations:string[]};
  generatedAt:string;
  summary:Record<ScfAssessmentStatus,number>;
  evidenceContract:{population:string;sources:string[];integrity:string;knownExclusions:string[]};
  rows:ScfAssessmentRow[];
};
