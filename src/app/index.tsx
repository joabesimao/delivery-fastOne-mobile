import { isCourier } from "@/modules/auth/domain/Session";
import { useSession } from "@/modules/auth/presentation/useSession";
import { Redirect } from "expo-router";

export default function Index() {
  const { role } = useSession();
  return <Redirect href={isCourier(role) ? "/deliveries" : "/dashboard"} />;
}
