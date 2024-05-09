import PostForm from "@/components/PostForm";
import UserInformation from "@/components/UserInformation";
import Image from "next/image";

export default function Home() {
  return (
    <div className="grid grid-cols-8 mt-5 sm:px-5">
      <section className="hidden md:inline md:col-span-2">
        {/* User information */}
        <UserInformation />
      </section>

      <section className="col-span-full md:col-span-6 lg:col-span-4 lg:max-w-lg mx-auto w-full">
    
        {/* PostForm */}
        <PostForm />

      {/* PostFeed */}
      </section>

      <section className="hidden lg:inline justify-center col-span-2">
      {/* Widget */}
      </section>
      
    </div>
  );
}
