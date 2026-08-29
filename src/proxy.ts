import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Panel için iyimser kapı + oturum tazeleme (docs/panel-kurallari.md §1, Katman 1).
 *
 * Yalnızca /yonetim yollarında çalışır. Oturumu tazeler; oturum yoksa girişe,
 * oturum varken giriş sayfasına gidilmişse panele yönlendirir.
 *
 * DİKKAT: Bu yalnızca ön eleme. Asıl yetki kontrolü panel layout'unda ve her
 * Server Action'da getStaffUser() ile yapılır (Katman 2-3). Personel/rol kontrolü
 * burada YAPILMAZ (middleware'de DB rol sorgusu önerilmez).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Oturum cerezi JS'e kapali — session.ts'teki gerekce ile ayni.
      // Proxy oturumu tazelerken cerezi yeniden yazdigi icin ayni secenekleri
      // BURADA DA vermek gerekir; yoksa tazeleme httpOnly'yi dusuruyor.
      cookieOptions: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isLogin = path === "/yonetim/giris";

  if (!user && !isLogin) {
    return NextResponse.redirect(new URL("/yonetim/giris", request.url));
  }
  if (user && isLogin) {
    return NextResponse.redirect(new URL("/yonetim", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/yonetim/:path*"],
};
