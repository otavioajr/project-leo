export type CustomField = {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'multiselect';
  required: boolean;
  options?: string[];
};

export type RegistrationCustomValue = string | string[];

export type RegistrationCustomData = Record<string, RegistrationCustomValue>;

export type Bateria = {
  id: string;
  adventure_id: string;
  label: string;
  start_time: string;
  end_time: string;
  capacity: number;
  sort_order: number;
  created_at: string;
};

export type BateriaAvailability = {
  id: string;
  label: string;
  start_time: string;
  end_time: string;
  capacity: number;
  sort_order: number;
  reserved: number;
};

export type BateriaAssignments = {
  principal: string;
  participants: string[];
};

export type Adventure = {
  id: string;
  slug: string;
  title: string;
  description: string;
  long_description: string;
  max_participants: number | null;
  price: number;
  duration: string;
  location: string;
  difficulty: 'Fácil' | 'Moderado' | 'Desafiador';
  image_url: string;
  image_description: string;
  registrations_enabled: boolean;
  has_baterias: boolean;
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
    custom_data?: RegistrationCustomData;
    bateria_assignments?: BateriaAssignments | null;
};

export type HomePageContent = {
  id?: string;
  heroTitle: string;
  heroDescription: string;
  heroImageUrl: string;
  heroImageDescription: string;
  adventuresTitle: string;
  adventuresDescription: string;
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

export type PixGroupSize = 1 | 2 | 3 | 4;

export type PixCopiaEColaByGroupSize = {
  1: string;
  2: string;
  3: string;
  4: string;
};

export type PixConfig = {
  pixCopiaECola: PixCopiaEColaByGroupSize;
  pixEnabled: boolean;
  instructions?: string;
};

export type PaymentStatus = 'pending' | 'awaiting_confirmation' | 'confirmed';
