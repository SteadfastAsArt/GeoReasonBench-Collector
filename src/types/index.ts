// Data entry interface
export interface DataEntry {
  id: string;
  image?: string; // Image path or base64
  query: string; // Required field
  solution?: string; // Optional field
  gt_answer: string; // Required field
  tags: Record<string, any>; // Custom tags
  createdAt: string;
  updatedAt: string;
  version: number;
  history?: DataEntryHistory[];
}

// Data entry history record
export interface DataEntryHistory {
  version: number;
  data: Partial<DataEntry>;
  timestamp: string;
  action: 'create' | 'update' | 'delete';
}

// Tag configuration
export interface TagConfig {
  id: string;
  name: string; // Internal field name
  label: string; // Display label
  type: 'select' | 'multiSelect' | 'input' | 'textarea' | 'boolean' | 'rating' | 'date' | 'number' | 'slider';
  required?: boolean;
  description?: string;
  placeholder?: string;
  
  // Options for select/multiSelect types
  options?: string[];
}

export interface TagOption {
  label: string;
  value: string;
}

// Export configuration
export interface ExportConfig {
  format: 'json' | 'openai';
  imagePath: string; // Image storage path
  includeHistory: boolean;
  customRules?: Record<string, any>; // Custom conversion rules
  exportImages?: boolean; // Whether to export actual image files
  exportFormat?: 'zip' | 'separate'; // How to export images: in one zip or separate files
}

// OpenAI格式的对话数据
export interface OpenAIConversation {
  messages: OpenAIMessage[];
}

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | OpenAIContent[];
}

export interface OpenAIContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

// Statistics data interface
export interface StatisticsData {
  totalEntries: number;
  completedEntries: number;
  tagDistribution: Record<string, number>;
  fieldCompleteness: {
    image: number;
    query: number;
    solution: number;
    gt_answer: number;
  };
  timeSeriesData: {
    date: string;
    count: number;
  }[];
}

// Filter condition
export interface FilterCondition {
  tags: Record<string, any>;
  keyword: string;
  dateRange: [string, string] | null;
  hasImage: boolean | null;
}

// Application state
export interface AppState {
  dataEntries: DataEntry[];
  tagConfigs: TagConfig[];
  currentEntry: DataEntry | null;
  filterCondition: FilterCondition;
  exportConfig: ExportConfig;
  statistics: StatisticsData;
}

// Component Props types
export interface DataEntryFormProps {
  entry?: DataEntry;
  tagConfigs: TagConfig[];
  onSave: (entry: DataEntry) => void;
  onCancel: () => void;
}

export interface DataListProps {
  entries: DataEntry[];
  tagConfigs: TagConfig[];
  onEdit: (entry: DataEntry) => void;
  onDelete: (id: string) => void;
  onFilter: (condition: FilterCondition) => void;
}

export interface VisualizationProps {
  statistics: StatisticsData;
  entries: DataEntry[];
}

export interface ExportModalProps {
  visible: boolean;
  entries: DataEntry[];
  onExport: (config: ExportConfig) => void;
  onCancel: () => void;
}