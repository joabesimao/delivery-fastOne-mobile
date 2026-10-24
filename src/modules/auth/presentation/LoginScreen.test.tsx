import { AppError } from "@/core/errors/AppError";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { LoginScreen } from "./LoginScreen";

const mockLogin = jest.fn();
const mockSignedOut = { status: "signedOut", session: null, signOutReason: null };

jest.mock("@/main/container", () => ({
  container: {
    env: { apiUrl: "http://10.0.0.1:3000/api" },
    sessionManager: {
      login: (...args: unknown[]) => mockLogin(...args),
      subscribe: () => () => undefined,
      getState: () => mockSignedOut,
    },
  },
}));

describe("LoginScreen", () => {
  beforeEach(() => mockLogin.mockReset());

  it("valida os campos antes de chamar a API", async () => {
    await render(<LoginScreen />);

    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Informe um e-mail válido.")).toBeTruthy();
    expect(screen.getByText("Informe a senha.")).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("envia as credenciais", async () => {
    mockLogin.mockResolvedValueOnce({});
    await render(<LoginScreen />);

    await fireEvent.changeText(screen.getByLabelText("E-mail"), "ana@fastone.com");
    await fireEvent.changeText(screen.getByLabelText("Senha"), "segredo");
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith({ email: "ana@fastone.com", password: "segredo" }),
    );
  });

  it("mostra mensagem amigável para credenciais erradas", async () => {
    mockLogin.mockRejectedValueOnce(new AppError("unauthorized", "Unauthorized", { status: 401 }));
    await render(<LoginScreen />);

    await fireEvent.changeText(screen.getByLabelText("E-mail"), "ana@fastone.com");
    await fireEvent.changeText(screen.getByLabelText("Senha"), "errada");
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("E-mail ou senha incorretos.")).toBeTruthy();
  });

  it("explica quando o servidor não responde, mostrando o endereço usado", async () => {
    mockLogin.mockRejectedValueOnce(new AppError("network"));
    await render(<LoginScreen />);

    await fireEvent.changeText(screen.getByLabelText("E-mail"), "ana@fastone.com");
    await fireEvent.changeText(screen.getByLabelText("Senha"), "x");
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText(/http:\/\/10\.0\.0\.1:3000\/api/)).toBeTruthy();
  });
});
