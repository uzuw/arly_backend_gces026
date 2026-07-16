import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password, username } = body as {
    email?: string;
    password?: string;
    username?: string;
  };

  if (!email || !password || !username) {
    return NextResponse.json(
      { error: "email, password, and username are required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      message: "Signup successful. Check your email for a confirmation link.",
      user: data.user,
    },
    { status: 201 }
  );
}
