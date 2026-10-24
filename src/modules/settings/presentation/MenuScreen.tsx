import { canOperate, isAdmin, isFleetManager } from "@/modules/auth/domain/Session";
import { ProfileScreen } from "@/modules/auth/presentation/ProfileScreen";
import { useSession } from "@/modules/auth/presentation/useSession";
import { MenuItem } from "@/shared/layout";
import { spacing } from "@/shared/theme";
import { SectionTitle, type IconName } from "@/shared/ui";
import { useRouter, type Href } from "expo-router";
import { View } from "react-native";

interface Entry {
  icon: IconName;
  label: string;
  description?: string;
  href: Href;
  visible?: boolean;
}

// Mesmo agrupamento do menu lateral do painel web.
export function MenuScreen() {
  const router = useRouter();
  const { role } = useSession();
  const operator = canOperate(role);
  const admin = isAdmin(role);
  const fleetManager = isFleetManager(role);

  const sections: { title: string; entries: Entry[] }[] = [
    {
      title: "Operação",
      entries: [
        {
          icon: "search-outline",
          label: "Buscar",
          description: "Pedidos, clientes e entregadores",
          href: "/search",
        },
        {
          icon: "add-circle-outline",
          label: "Realizar entrega",
          description: "Novo pedido e folha de entrega",
          href: "/new-delivery",
          visible: operator,
        },
        { icon: "people-outline", label: "Clientes", href: "/clients", visible: operator },
        { icon: "pricetags-outline", label: "Produtos", href: "/products", visible: operator },
      ],
    },
    {
      title: "Relatórios",
      entries: [
        {
          icon: "pie-chart-outline",
          label: "Relatórios do painel",
          description: "Status, bairros e cidades",
          href: "/reports/overview",
        },
        {
          icon: "bar-chart-outline",
          label: "Relatórios das entregas",
          description: "Receita, ticket médio e exportação",
          href: "/reports/deliveries",
        },
        {
          icon: "trophy-outline",
          label: "Ranking de entregadores",
          description: "Com exportação em CSV",
          href: "/reports/ranking",
        },
      ],
    },
    {
      title: "Cadastros",
      entries: [
        { icon: "bicycle-outline", label: "Entregadores", href: "/deliverymen" },
        { icon: "car-outline", label: "Veículos", href: "/vehicles" },
        { icon: "speedometer-outline", label: "Abastecimentos", href: "/fuel-refills" },
        { icon: "construct-outline", label: "Trocas de óleo", href: "/oil-changes" },
        { icon: "business-outline", label: "Cidades", href: "/cities" },
        { icon: "map-outline", label: "Bairros", href: "/neighborhoods" },
      ],
    },
    {
      title: "Administração",
      entries: [
        {
          icon: "shield-checkmark-outline",
          label: "Usuários",
          description: "Contas e perfis de acesso",
          href: "/users",
          visible: admin,
        },
        { icon: "megaphone-outline", label: "Enviar aviso", href: "/broadcast", visible: admin },
        {
          icon: "settings-outline",
          label: "Configurações de frota",
          description: "Intervalo da troca de óleo",
          href: "/settings/fleet",
          visible: fleetManager,
        },
      ],
    },
  ];

  return (
    <ProfileScreen
      menu={sections.map(({ title, entries }) => {
        const visible = entries.filter((e) => e.visible !== false);
        if (visible.length === 0) return null;
        return (
          <View key={title} style={{ gap: spacing.sm }}>
            <SectionTitle>{title}</SectionTitle>
            {visible.map((e) => (
              <MenuItem
                key={e.label}
                icon={e.icon}
                label={e.label}
                description={e.description}
                onPress={() => router.push(e.href)}
              />
            ))}
          </View>
        );
      })}
    />
  );
}
