// Cliente único de la app. Reexporta el cliente generado por la integración
// para que no existan dos instancias distintas con credenciales diferentes.
export { supabase } from "@/integrations/supabase/client";
