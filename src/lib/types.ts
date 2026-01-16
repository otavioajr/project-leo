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
  imageId: string;
  registrationsEnabled: boolean;
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
};
