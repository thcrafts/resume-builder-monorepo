import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ContactEmbedded {
  @Prop({ required: true })
  id: string;

  @Prop({ default: '' })
  label: string;

  @Prop({ default: '' })
  address: string;

  @Prop({ default: '' })
  email: string;

  @Prop({ default: '' })
  phone: string;

  @Prop({ default: '' })
  linkedin: string;

  @Prop({ default: false })
  isPrimary: boolean;
}

@Schema({ _id: false })
export class EducationEmbedded {
  @Prop({ default: '' })
  degree: string;

  @Prop({ default: '' })
  institution: string;

  @Prop({ default: '' })
  date_range: string;

  @Prop({ default: '' })
  location: string;
}

@Schema({ _id: false })
export class SkillCategoryEmbedded {
  @Prop({ required: true })
  category: string;

  @Prop({ type: [String], default: [] })
  items: string[];
}

@Schema({ _id: false })
export class CandidateProfileEmbedded {
  @Prop({ default: '' })
  professionalTitle: string;

  @Prop({ type: [EducationEmbedded], default: [] })
  education: EducationEmbedded[];

  @Prop({ type: [Object], default: [] })
  certifications: Record<string, unknown>[];

  @Prop({ type: [SkillCategoryEmbedded], default: [] })
  baselineSkills: SkillCategoryEmbedded[];

  @Prop()
  yearsOfExperience?: number;
}

@Schema({ _id: false })
export class CompanyEmbedded {
  @Prop({ required: true })
  id: string;

  @Prop({ default: '' })
  company: string;

  @Prop({ default: '' })
  title: string;

  @Prop({ default: '' })
  date_range: string;

  @Prop({ default: '' })
  job_type: string;

  @Prop({ default: '' })
  location: string;

  @Prop({ default: '' })
  product: string;

  @Prop({ default: '' })
  mission: string;

  @Prop({ default: '' })
  context: string;

  @Prop({ default: 0 })
  sortOrder: number;
}

export const ContactSchema = SchemaFactory.createForClass(ContactEmbedded);
export const EducationSchema = SchemaFactory.createForClass(EducationEmbedded);
export const SkillCategorySchema = SchemaFactory.createForClass(SkillCategoryEmbedded);
export const CandidateProfileSchema =
  SchemaFactory.createForClass(CandidateProfileEmbedded);
export const CompanySchema = SchemaFactory.createForClass(CompanyEmbedded);
