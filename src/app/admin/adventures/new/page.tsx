import { AdventureForm } from "../_components/adventure-form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function NewAdventurePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Adventure</CardTitle>
        <CardDescription>
          Fill out the form below to add a new adventure to your website.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AdventureForm />
      </CardContent>
    </Card>
  );
}
