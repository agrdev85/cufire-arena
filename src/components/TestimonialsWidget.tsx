import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Quote, Send } from "lucide-react";
import { api, useAuth } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface Testimonial {
  text: string;
  author: string;
}

interface TestimonialsWidgetProps {
  trigger: React.ReactNode;
}

const TestimonialsWidget: React.FC<TestimonialsWidgetProps> = ({ trigger }) => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [testimonialText, setTestimonialText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      const fetchTestimonials = async () => {
        try {
          setLoading(true);
          setError(null);
          const response = await api.getTestimonials();
          setTestimonials(response.testimonials || []);
        } catch (error) {
          console.error('Error fetching testimonials:', error);
          setError('No se pudieron cargar las opiniones. Inténtalo de nuevo más tarde.');
        } finally {
          setLoading(false);
        }
      };

      fetchTestimonials();
    }
  }, [open]);

  const handleSubmitTestimonial = async () => {
    if (!testimonialText.trim()) return;

    try {
      setSubmitting(true);
      await api.submitTestimonial(testimonialText.trim());
      setTestimonialText('');
      toast({
        title: "Testimonio enviado",
        description: "¡Gracias por compartir tu opinión!",
      });
      // Refresh testimonials
      const response = await api.getTestimonials();
      setTestimonials(response.testimonials || []);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el testimonio",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-orbitron font-bold mb-4 bg-gradient-accent bg-clip-text text-transparent">
            OPINIONES DE NUESTROS GUERREROS  
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-lg text-muted-foreground">
              Cargando opiniones...
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-lg text-red-500">
              {error}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-card/50 backdrop-blur-sm cyber-border hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-cyber-gold text-cyber-gold" />
                    ))}
                  </div>
                  <Quote className="h-6 w-6 text-neon-purple opacity-50" />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 italic">
                    "{testimonial.text}"
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-neon-blue border-neon-blue">
                      {testimonial.author}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {isAuthenticated && (
          <div className="mt-6 p-4 bg-card/50 rounded-lg border border-border">
            <h3 className="text-lg font-semibold mb-3 text-center">Comparte tu opinión</h3>
            <div className="space-y-3">
              <Textarea
                placeholder="Escribe tu testimonio sobre CUFIRE Arena..."
                value={testimonialText}
                onChange={(e) => setTestimonialText(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <Button
                onClick={handleSubmitTestimonial}
                disabled={submitting || !testimonialText.trim()}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {submitting ? 'Enviando...' : 'Enviar Testimonio'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Solo puedes enviar un testimonio por día
            </p>
          </div>
        )}

        <div className="text-center mt-6">
          <p className="text-muted-foreground">
            ¡Únete a la comunidad y vive la experiencia! Regístrate ahora y participa en torneos emocionantes.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TestimonialsWidget;