// Fontes de ícones não carregam no Jest; nos testes o ícone vira um componente vazio.
jest.mock("@expo/vector-icons/Ionicons", () => {
  const Ionicons = () => null;
  return { __esModule: true, default: Ionicons };
});
