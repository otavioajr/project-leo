export type CustomField = {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number';
  required: boolean;
};

export type Adventure = {
  id: string;
  slug: string;
  title: string;
  description: string;
  longDescription: string;
  price: number;
  duration: string;
  location: string;
  difficulty: 'Fácil' | 'Moderado' | 'Desafiador';
  imageUrl: string;
  imageDescription: string;
  registrationsEnabled: boolean;
  customFields?: CustomField[];
};

export type Registration = {
    id: string;
    adventureId: string;
    adventureTitle: string;
    name: string;
    email: string;
    phone: string;
    registrationDate: string;
    groupSize: number;
    participants?: Record<string, string>[];
};

export type HomePageContent = {
  heroTitle: string;
  heroDescription: string;
  heroImageUrl: string;
  heroImageDescription: string;
  adventuresTitle: string;
  adventuresDescription: string;
};

export type ContentPage = {
  slug: string;
  title: string;
  content: string;
};
