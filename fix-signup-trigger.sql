-- Fix the handle_new_user function to handle NULL values properly
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    full_name, 
    role, 
    business_name,
    location_lat,
    location_lng,
    location_address
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer'),
    NULLIF(NEW.raw_user_meta_data->>'business_name', ''),
    CASE 
      WHEN NEW.raw_user_meta_data->>'location_lat' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'location_lat')::DOUBLE PRECISION
      ELSE NULL
    END,
    CASE 
      WHEN NEW.raw_user_meta_data->>'location_lng' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'location_lng')::DOUBLE PRECISION
      ELSE NULL
    END,
    NULLIF(NEW.raw_user_meta_data->>'location_address', '')
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and return NEW to allow auth to proceed
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
