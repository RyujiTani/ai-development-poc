export type Status = 'ACTIVE' | 'INACTIVE' | 'RETIRED' | 'LOCKED' | 'DISABLED';

export interface Worker {
  worker_id: string;
  contractor_id: string;
  name: string;
  contact?: string;
  qualifications: string[];       // 資格コード配列
  trainings: Array<{ code: string; taken_at: string }>;
  status: Extract<Status, 'ACTIVE' | 'RETIRED'>;
  retired_at?: string;
  created_at: string;
  updated_at: string;
}

// 資格マスタ定義
export interface QualificationMaster {
  code: string;
  name: string;
}

export const QUALIFICATIONS_MASTER: QualificationMaster[] = [
  { code: 'QUAL_001', name: '玉掛け技能講習' },
  { code: 'QUAL_002', name: 'クレーン運転士免状' },
  { code: 'QUAL_003', name: '足場の組立て等作業主任者' },
  { code: 'QUAL_004', name: '高所作業車運転技能講習' },
  { code: 'QUAL_005', name: '第一種酸素欠乏危険作業主任者' }
];

// 講習マスタ定義
export interface TrainingMaster {
  code: string;
  name: string;
}

export const TRAININGS_MASTER: TrainingMaster[] = [
  { code: 'TR_001', name: '新規入場者安全教育' },
  { code: 'TR_002', name: '職長・安全衛生責任者教育' },
  { code: 'TR_003', name: '特別安全衛生教育（アーク溶接等）' },
  { code: 'TR_004', name: '感電防止特別教育' }
];