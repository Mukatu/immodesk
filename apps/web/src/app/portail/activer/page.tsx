import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/** Repli si le lien d'activation (avec son jeton) n'a pas été utilisé directement. */
export default function ActivationSansJetonPage() {
  return (
    <main
      id="contenu-principal"
      className="flex min-h-screen items-center justify-center px-4 py-12"
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Portail bailleur</CardTitle>
          <CardDescription>
            Utilisez le lien reçu par WhatsApp de votre gestionnaire pour activer votre accès.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </main>
  );
}
