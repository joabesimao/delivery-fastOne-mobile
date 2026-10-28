import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

export interface PickedImage {
  base64: string;
  mimeType: string;
  uri: string;
}

const MAX_SIDE = 1280;

// Reduz e recomprime antes de mandar em base64: a API recusa imagens acima de 5 MB.
const shrink = async (asset: ImagePicker.ImagePickerAsset): Promise<PickedImage | null> => {
  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width > MAX_SIDE || asset.height > MAX_SIDE) {
    context.resize(
      asset.width >= asset.height
        ? { width: MAX_SIDE, height: null }
        : { width: null, height: MAX_SIDE },
    );
  }
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  return result.base64 ? { base64: result.base64, mimeType: "image/jpeg", uri: result.uri } : null;
};

const launch = async (source: "camera" | "library") => {
  const permission =
    source === "camera"
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      "Permissão negada",
      source === "camera"
        ? "Libere o acesso à câmera nas configurações do aparelho."
        : "Libere o acesso às fotos nas configurações do aparelho.",
    );
    return null;
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1 };
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;
  return shrink(result.assets[0]);
};

// Pergunta a origem (câmera ou galeria) e devolve a imagem pronta para enviar.
export const pickImage = () =>
  new Promise<PickedImage | null>((resolve) =>
    Alert.alert(
      "Adicionar imagem",
      undefined,
      [
        { text: "Câmera", onPress: () => void launch("camera").then(resolve, () => resolve(null)) },
        {
          text: "Galeria",
          onPress: () => void launch("library").then(resolve, () => resolve(null)),
        },
        { text: "Cancelar", style: "cancel", onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    ),
  );

export const imageUri = (image: { base64: string; mimeType: string }) =>
  image.base64.startsWith("data:") ? image.base64 : `data:${image.mimeType};base64,${image.base64}`;
