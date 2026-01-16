"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Adventure } from "@/lib/types";
import { saveAdventure, deleteAdventure } from "@/lib/actions/admin-actions";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trash } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const adventureSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  description: z.string().min(10, "Short description must be at least 10 characters.").max(150, "Short description must be less than 150 characters."),
  longDescription: z.string().min(20, "Long description must be at least 20 characters."),
  price: z.coerce.number().min(0, "Price must be a positive number."),
  duration: z.string().min(1, "Duration is required."),
  location: z.string().min(1, "Location is required."),
  difficulty: z.enum(["Easy", "Moderate", "Challenging"]),
  imageId: z.string().min(1, "Image ID is required."),
  registrationsEnabled: z.boolean(),
});

type AdventureFormValues = z.infer<typeof adventureSchema>;

type AdventureFormProps = {
  adventure?: Adventure;
};

export function AdventureForm({ adventure }: AdventureFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<AdventureFormValues>({
    resolver: zodResolver(adventureSchema),
    defaultValues: {
      title: adventure?.title || "",
      description: adventure?.description || "",
      longDescription: adventure?.longDescription || "",
      price: adventure?.price || 0,
      duration: adventure?.duration || "",
      location: adventure?.location || "",
      difficulty: adventure?.difficulty || "Moderate",
      imageId: adventure?.imageId || "adventure-1",
      registrationsEnabled: adventure?.registrationsEnabled ?? true,
    },
  });

  async function onSubmit(values: AdventureFormValues) {
    setIsSubmitting(true);
    const result = await saveAdventure({ id: adventure?.id, ...values });

    if (result.success && result.adventure) {
      toast({
        title: adventure ? "Adventure Updated" : "Adventure Created",
        description: `"${result.adventure.title}" has been saved.`,
      });
      router.push("/admin/adventures");
      router.refresh();
    } else {
      toast({
        title: "Save Failed",
        description: result.message || "Something went wrong.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  }
  
  async function handleDelete() {
    if (!adventure) return;
    setIsDeleting(true);
    const result = await deleteAdventure(adventure.id);
    if(result.success) {
        toast({
            title: "Adventure Deleted",
            description: `"${adventure.title}" has been removed.`,
        });
        router.push("/admin/adventures");
        router.refresh();
    } else {
        toast({
            title: "Deletion Failed",
            description: "Something went wrong.",
            variant: "destructive",
        });
        setIsDeleting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Mountain Ridge Hike" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Short Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="A brief, catchy description for the adventure card." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="longDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="A detailed description for the adventure page." rows={6} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="space-y-8">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price ($)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Full Day, 3 Hours" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Alpine Ridge" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="difficulty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Difficulty</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Moderate">Moderate</SelectItem>
                      <SelectItem value="Challenging">Challenging</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="imageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image ID</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., adventure-1" {...field} />
                  </FormControl>
                   <FormDescription>From placeholder-images.json</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="registrationsEnabled"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <FormLabel>Enable Registrations</FormLabel>
                        <FormDescription>
                        Allow users to register for this adventure.
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
                    </FormItem>
                )}
                />
          </div>
        </div>
        <div className="flex justify-between items-center">
            <div>
            {adventure && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" disabled={isDeleting}>
                        <Trash className="mr-2 h-4 w-4" />
                        {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the
                        adventure and all associated registrations.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                        Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
             )}
            </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
