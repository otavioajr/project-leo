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
  long_description: string;
  price: number;
  duration: string;
  location: string;
  difficulty: 'Fácil' | 'Moderado' | 'Desafiador';
  image_url: string;
  image_description: string;
  registrations_enabled: boolean;
  custom_fields?: CustomField[];
  created_at: string;
};

export type Registration = {
    id: string;
    adventure_id: string;
    adventure_title: string;
    name: string;
    email: string;
    phone: string;
    registration_date: string;
    group_size: number;
    participants?: Record<string, string>[];
    payment_status?: PaymentStatus;
    total_amount?: number;
    registration_token?: string;
    custom_data?: Record<string, string>;
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
  show_in_header: boolean;
  nav_order?: number;
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
