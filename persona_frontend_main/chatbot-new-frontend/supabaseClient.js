import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const saveUserDetails = async (user) => {
    const { data: authUser } = await supabase.auth.getUser();
    if (!authUser) {
      console.error("User is not authenticated.");
      return;
    }
  
    const { email, name, gender } = user;
  
    const { error } = await supabase
      .from("user_details")
      .upsert([{ email, name, gender }], { onConflict: ["email"] });                  //removed city parameter
  
    if (error) {
      console.error("Error saving user details:", error.message);
    } else {
      console.log("User details saved successfully!");
    }
  };
  
export const supabase = createClient(supabaseUrl,supabaseAnonKey , saveUserDetails);
