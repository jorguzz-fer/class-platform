import { requireOrg } from "@/lib/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default async function StudentProfilePage() {
  const ctx = await requireOrg();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Meu perfil</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da conta</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Nome</Label>
            <Input defaultValue={ctx.name} disabled />
          </div>
          <div className="flex flex-col gap-2">
            <Label>E-mail</Label>
            <Input defaultValue={ctx.email} disabled />
          </div>
          <p className="text-xs text-muted-foreground">
            A edição de perfil será habilitada em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
