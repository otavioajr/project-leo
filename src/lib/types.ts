export type CustomFieldAudience = 'primary' | 'additional' | 'all';

export type CustomField = {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'multiselect' | 'tshirt_size';
  required: boolean;
  audience?: CustomFieldAudience;
  options?: string[];
  helpImageUrl?: string;
};

export type RegistrationCustomValue = string | string[];

export type RegistrationCustomData = Record<string, RegistrationCustomValue>;

export type RegistrationParticipantData = RegistrationCustomData;

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

export type Lote = {
  id: string;
  adventure_id: string;
  bateria_id: string | null;
  label: string;
  sort_order: number;
  capacity: number;
  price: number;
  pix_copia_cola: string;
  created_at: string;
};

export type LoteAvailability = {
  id: string;
  bateria_id: string | null;
  label: string;
  sort_order: number;
  capacity: number;
  price: number;
  reserved: number;
};

export type ActiveLote = LoteAvailability & {
  remaining: number;
};

export type BateriaWithLoteAvailability = {
  id: string;
  label: string;
  start_time: string;
  end_time: string;
  sort_order: number;
  active_lote_id: string | null;
  active_lote_label: string | null;
  active_lote_price: number | null;
  active_lote_remaining: number;
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
  difficulty: string | null;
  image_url: string;
  image_description: string;
  registrations_enabled: boolean;
  is_enabled: boolean;
  has_baterias: boolean;
  has_lotes: boolean;
  image_rights_enabled: boolean;
  custom_fields?: CustomField[];
  pix_config?: PixConfig | null;
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
    participants?: RegistrationParticipantData[];
    payment_status?: PaymentStatus;
    total_amount?: number;
    registration_token?: string;
    custom_data?: RegistrationCustomData;
    bateria_assignments?: BateriaAssignments | null;
    lote_id?: string | null;
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
  whatsAppNumber?: string;
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
