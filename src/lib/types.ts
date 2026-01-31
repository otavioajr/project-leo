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
    paymentStatus?: PaymentStatus;
    totalAmount?: number;
};

export type HomePageContent = {
  id?: string;
  heroTitle: string;
  heroDescription: string;
  heroImageUrl: string;
  heroImageDescription: string;
  adventuresTitle: string;
  adventuresDescription: string;
  // Redes Sociais
  facebookUrl?: string;
  facebookEnabled?: boolean;
  instagramUrl?: string;
  instagramEnabled?: boolean;
  twitterUrl?: string;
  twitterEnabled?: boolean;
};

export type ContentPage = {
  id: string;
  slug: string;
  title: string;
  content: string;
  showInHeader: boolean;
  navOrder?: number;
};

export type AdminRole = {
  isAdmin: boolean;
};

export type PixConfig = {
  pixCopiaECola: string;
  pixEnabled: boolean;
  instructions?: string;
};

export type PaymentStatus = 'pending' | 'awaiting_confirmation' | 'confirmed';
