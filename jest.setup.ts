jest.mock("@expo/vector-icons/Ionicons", () => {
  const Ionicons = () => null;
  return { __esModule: true, default: Ionicons };
});
