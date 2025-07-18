import { Annotation } from './annotations';
export type { Annotation };

export interface UploadedImage {
  id: string;
  file: File;
  url: string;
  name: string;
  width: number;
  height: number;
  annotations: Annotation[];
}

export interface DocumentationStep {
  id: string;
  title: string;
  description: string;
  imageId: string;
  annotations: string[];
  order: number;
}

export interface DocumentationTemplate {
  id: string;
  name: string;
  format: 'pdf' | 'html' | 'word';
  styling: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    fontSize: number;
  };
}

export interface Project {
  id: string;
  name: string;
  description: string;
  images: UploadedImage[];
  steps: DocumentationStep[];
  template: DocumentationTemplate;
  lastModified?: Date;
}