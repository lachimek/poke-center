import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
    };
  }

  interface User {
    id: string;
    email: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
  }
}
