import { getRegistrations } from "@/lib/data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { User, Mail, Phone } from "lucide-react";

export default async function RegistrationsPage() {
  const registrations = await getRegistrations();

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Registrations</CardTitle>
        <CardDescription>
          View all user registrations for your adventures.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Adventure</TableHead>
              <TableHead>Registrant</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrations.length > 0 ? (
              registrations.map((reg) => (
                <TableRow key={reg.id}>
                  <TableCell className="font-medium">{reg.adventureTitle}</TableCell>
                  <TableCell className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {reg.name}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <a href={`mailto:${reg.email}`} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2">
                        <Mail className="h-4 w-4" />{reg.email}
                      </a>
                      <a href={`tel:${reg.phone}`} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2">
                        <Phone className="h-4 w-4" />{reg.phone}
                      </a>
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(reg.registrationDate), "PPP p")}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  No registrations found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
