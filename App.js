// Importa o React e os hooks useState (para estado), useEffect (para ciclo de vida) e useRef (para referência à câmera)
import React, { useState, useEffect, useRef } from "react";
// Importa os componentes nativos do React Native para montar a tela
import {
  View,
  Text,
  Button,
  Image,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from "react-native";

// Importa a biblioteca expo-image-picker APENAS para seleção da galeria (mantida conforme original)
import * as ImagePicker from "expo-image-picker";
// Importa a biblioteca do Expo para salvar mídias na galeria do dispositivo
import * as MediaLibrary from "expo-media-library";

// Importa os componentes e hooks da react-native-vision-camera para captura de foto e vídeo
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
} from "react-native-vision-camera";

// Declaração do componente principal do aplicativo
export default function App() {
  // Estado para armazenar o caminho (URI) da imagem ou vídeo capturado/selecionado (inicia como null)
  const [image, setImage] = useState(null);
  // Estado para armazenar o tipo de mídia atual ('image' ou 'video') para controle de renderização
  const [mediaType, setMediaType] = useState("image");

  // Estado para controlar qual câmera está ativa: 'back' (traseira) ou 'front' (frontal)
  const [cameraPosition, setCameraPosition] = useState("back");
  // Estado para controlar o modo de flash: 'off', 'on' ou 'auto'
  const [flash, setFlash] = useState("off");
  // Estado para indicar se uma gravação de vídeo está em andamento (feedback visual)
  const [isRecording, setIsRecording] = useState(false);
  // Estado para controlar se o preview da câmera está visível na tela
  const [showCamera, setShowCamera] = useState(false);
  // Estado para controlar o modo da câmera: 'photo' (foto) ou 'video' (vídeo)
  const [cameraMode, setCameraMode] = useState("photo");

  // Hook da vision-camera para obter o dispositivo de câmera com base na posição selecionada
  const device = useCameraDevice(cameraPosition);

  // Hook da vision-camera para verificar e solicitar a permissão de câmera
  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } =
    useCameraPermission();
  // Hook da vision-camera para verificar e solicitar a permissão de microfone
  const { hasPermission: hasMicPermission, requestPermission: requestMicPermission } =
    useMicrophonePermission();

  // Referência direta ao componente Camera da vision-camera (usado para chamar takePhoto e startRecording)
  const cameraRef = useRef(null);

  // useEffect que executa uma única vez assim que a tela do aplicativo é carregada
  useEffect(() => {
    // Função assíncrona para solicitar todas as permissões necessárias ao abrir o app
    (async () => {
      // Solicita a permissão de acesso à câmera via hook da vision-camera
      await requestCameraPermission();
      // Solicita a permissão de uso do microfone via hook da vision-camera
      await requestMicPermission();
      // Solicita permissão de acesso e escrita na galeria de fotos (expo-media-library)
      await MediaLibrary.requestPermissionsAsync();
      // Solicita permissão de acesso à galeria do expo-image-picker para seleção de mídia
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })(); // Executa a função imediatamente
  }, []); // O array de dependências vazio garante que a função só execute uma única vez

  // Função para alternar entre a câmera traseira e frontal em tempo real
  const toggleCamera = () => {
    // Alterna o estado da posição da câmera entre 'back' e 'front'
    setCameraPosition((prev) => (prev === "back" ? "front" : "back"));
  };

  // Função para alternar o modo de flash entre 'off', 'on' e 'auto'
  const toggleFlash = () => {
    // Alterna o flash ciclicamente entre os três modos disponíveis
    setFlash((prev) => {
      if (prev === "off") return "on";
      if (prev === "on") return "auto";
      return "off";
    });
  };

  // 1. FUNÇÃO PARA TIRAR FOTO usando a react-native-vision-camera
  const takePhoto = async () => {
    // Verifica se a permissão de câmera foi concedida antes de abrir o preview
    if (!hasCameraPermission) {
      const result = await requestCameraPermission();
      if (!result) {
        Alert.alert("Erro", "Permissão de câmera não concedida.");
        return;
      }
    }
    // Define o modo como foto e exibe o preview da câmera em tela cheia
    setCameraMode("photo");
    setShowCamera(true);
  };

  // Função auxiliar chamada ao pressionar o botão de captura no preview (modo foto)
  const handleTakePhoto = async () => {
    // Verifica se a referência à câmera está disponível antes de capturar
    if (!cameraRef.current) return;

    try {
      // Captura a foto usando a vision-camera, aplicando o modo de flash configurado
      const photo = await cameraRef.current.takePhoto({
        flash: flash, // Aplica o modo de flash selecionado pelo usuário ('off', 'on' ou 'auto')
      });

      // Monta a URI completa do arquivo de foto capturado (vision-camera v4 retorna path sem file://)
      const uri = "file://" + photo.path;
      // Salva a URI da foto no estado principal do app
      setImage(uri);
      // Salva o tipo da mídia como imagem
      setMediaType("image");
      // Fecha o preview da câmera após a captura bem-sucedida
      setShowCamera(false);

      try {
        // Tenta criar o asset de mídia na galeria física e pública do celular
        await MediaLibrary.createAssetAsync(uri);
        // Exibe o alerta de sucesso após o salvamento na galeria
        Alert.alert("Sucesso", "Imagem salva na galeria!");
      } catch (error) {
        // Exibe o alerta de erro em caso de falha no salvamento na galeria
        Alert.alert("Erro", "Erro ao salvar a imagem.");
      }
    } catch (error) {
      // Captura erros inesperados durante a captura da foto e alerta o usuário
      Alert.alert("Erro", "Houve um erro ao tirar a foto: " + error.message);
    }
  };

  // 2. FUNÇÃO PARA GRAVAR VÍDEO usando a react-native-vision-camera
  const recordVideo = async () => {
    // Verifica se as permissões de câmera e microfone foram concedidas
    let hasCam = hasCameraPermission;
    let hasMic = hasMicPermission;
    
    if (!hasCam) hasCam = await requestCameraPermission();
    if (!hasMic) hasMic = await requestMicPermission();

    if (!hasCam || !hasMic) {
      Alert.alert("Erro", "Permissões de câmera e microfone são necessárias para gravar vídeos.");
      return;
    }
    // Define o modo como vídeo e exibe o preview da câmera em tela cheia
    setCameraMode("video");
    setShowCamera(true);
  };

  // Função auxiliar chamada ao pressionar o botão de iniciar gravação no preview (modo vídeo)
  const handleStartRecording = async () => {
    // Verifica se a referência à câmera está disponível antes de iniciar a gravação
    if (!cameraRef.current) return;

    // Ativa o indicador visual de gravação em andamento (botão vermelho)
    setIsRecording(true);

    // Inicia a gravação de vídeo usando a vision-camera com callback de conclusão
    cameraRef.current.startRecording({
      // Callback chamado automaticamente quando a gravação for finalizada
      onRecordingFinished: async (video) => {
        // Monta a URI completa do arquivo de vídeo gravado
        const uri = "file://" + video.path;
        // Salva a URI do vídeo no estado principal
        setImage(uri);
        // Salva o tipo da mídia como vídeo
        setMediaType("video");
        // Desativa o indicador visual de gravação
        setIsRecording(false);
        // Fecha o preview da câmera após a gravação ser concluída
        setShowCamera(false);

        try {
          // Cria o asset de mídia do vídeo na pasta pública de vídeos do celular
          await MediaLibrary.createAssetAsync(uri);
          // Alerta o usuário sobre o sucesso da gravação e do salvamento
          Alert.alert("Sucesso", "Vídeo gravado e salvo na galeria!");
        } catch (error) {
          // Alerta o usuário caso ocorra uma falha ao salvar o vídeo na galeria
          Alert.alert("Erro", "Erro ao salvar o vídeo.");
        }
      },
      // Callback chamado em caso de erro durante a gravação
      onRecordingError: (error) => {
        // Exibe alerta de erro e desativa o indicador de gravação
        Alert.alert("Erro", "Houve um erro ao gravar o vídeo.");
        setIsRecording(false);
      },
    });
  };

  // Função auxiliar chamada ao pressionar o botão de parar gravação no preview
  const handleStopRecording = async () => {
    // Verifica se a referência à câmera está disponível antes de parar
    if (!cameraRef.current) return;
    // Para a gravação em andamento (o callback onRecordingFinished será chamado automaticamente)
    await cameraRef.current.stopRecording();
  };

  // 3. FUNÇÃO PARA SELECIONAR FOTO DA GALERIA (MANTIDA com expo-image-picker, exatamente como no original)
  const pickImage = async () => {
    // Abre a galeria de fotos do celular apenas para seleção de imagens
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Define que o usuário só pode escolher fotos/imagens
      quality: 1,                                       // Mantém a qualidade máxima da imagem selecionada
    });

    // Se o usuário selecionou uma imagem com sucesso e não cancelou
    if (!result.canceled) {
      // Obtém o endereço local da imagem selecionada na galeria
      const uri = result.assets[0].uri;
      // Salva a URI da imagem no estado principal do app
      setImage(uri);
      // Salva o tipo correspondente como imagem no estado
      setMediaType("image");
    }
  };

  // 4. FUNÇÃO PARA SELECIONAR VÍDEO DA GALERIA (MANTIDA com expo-image-picker, exatamente como no original)
  const pickVideo = async () => {
    // Abre a galeria de fotos do celular apenas para seleção de vídeos
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos, // Define que o usuário só pode escolher vídeos
      quality: 1,                                       // Mantém a qualidade máxima do vídeo selecionado
    });

    // Se o usuário selecionou um vídeo com sucesso e não cancelou
    if (!result.canceled) {
      // Obtém o endereço local do vídeo selecionado na galeria
      const uri = result.assets[0].uri;
      // Salva a URI do vídeo no estado principal do app
      setImage(uri);
      // Salva o tipo correspondente como vídeo no estado para exibição correta
      setMediaType("video");
    }
  };

  // Retorna a estrutura visual em JSX do aplicativo
  return (
    // View principal que ocupa toda a tela
    <View style={styles.container}>

      {/* Condição: exibe o preview da câmera quando showCamera é true */}
      {showCamera ? (
        // View que ocupa toda a tela para exibir o preview em tempo real
        <View style={styles.cameraContainer}>
          
          {/* Componente Camera da vision-camera — exibe o preview em tempo real ou texto de carregando */}
          {device ? (
            <Camera
              ref={cameraRef}              // Referência para chamar takePhoto e startRecording
              style={styles.camera}        // Ocupa toda a área do container
              device={device}              // Dispositivo de câmera selecionado (frontal ou traseira)
              isActive={showCamera}        // Ativa o preview somente quando showCamera é true
              photo={cameraMode === "photo"}  // Habilita o modo de foto conforme o modo selecionado
              video={cameraMode === "video"}  // Habilita o modo de vídeo conforme o modo selecionado
              audio={cameraMode === "video"}  // Habilita o áudio somente no modo de gravação de vídeo
            />
          ) : (
            <View style={[styles.camera, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' }]}>
              <Text style={{ color: 'white', fontSize: 18 }}>Carregando câmera...</Text>
            </View>
          )}

          {/* Botões de controle sobrepostos ao preview da câmera */}
          <View style={styles.cameraControls}>

            {/* Botão de troca de câmera (frontal ↔ traseira) em tempo real */}
            <TouchableOpacity style={styles.controlButton} onPress={toggleCamera}>
              <Text style={styles.controlButtonText}>
                {cameraPosition === "back" ? "📷 Frontal" : "📷 Traseira"}
              </Text>
            </TouchableOpacity>

            {/* Botão de controle de flash (off / on / auto) */}
            <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
              <Text style={styles.controlButtonText}>
                {flash === "off" ? "⚡ Flash OFF" : flash === "on" ? "⚡ Flash ON" : "⚡ Flash AUTO"}
              </Text>
            </TouchableOpacity>

            {/* Botão de cancelar — fecha o preview e volta para a tela principal */}
            <TouchableOpacity
              style={[styles.controlButton, styles.cancelButton]}
              onPress={() => {
                // Se estiver gravando, para a gravação antes de fechar o preview
                if (isRecording) {
                  cameraRef.current?.stopRecording();
                }
                setShowCamera(false);
                setIsRecording(false);
              }}
            >
              <Text style={styles.controlButtonText}>✕ Cancelar</Text>
            </TouchableOpacity>

          </View>

          {/* Botão de ação principal: capturar foto ou iniciar/parar gravação de vídeo */}
          <View style={styles.captureContainer}>

            {/* Condição: modo foto — exibe botão de tirar foto */}
            {cameraMode === "photo" && (
              <TouchableOpacity style={styles.captureButton} onPress={handleTakePhoto}>
                <Text style={styles.captureButtonText}>📸 Tirar Foto</Text>
              </TouchableOpacity>
            )}

            {/* Condição: modo vídeo e NÃO está gravando — exibe botão de iniciar gravação */}
            {cameraMode === "video" && !isRecording && (
              <TouchableOpacity
                style={[styles.captureButton, styles.recordButton]}
                onPress={handleStartRecording}
              >
                <Text style={styles.captureButtonText}>⏺ Iniciar Gravação</Text>
              </TouchableOpacity>
            )}

            {/* Condição: modo vídeo e ESTÁ gravando — exibe botão de parar com feedback visual */}
            {cameraMode === "video" && isRecording && (
              <TouchableOpacity
                style={[styles.captureButton, styles.stopButton]}
                onPress={handleStopRecording}
              >
                <Text style={styles.captureButtonText}>⏹ Parar Gravação</Text>
              </TouchableOpacity>
            )}

          </View>

          {/* Feedback visual: indicador de gravação em andamento exibido sobre o preview */}
          {isRecording && (
            <View style={styles.recordingIndicator}>
              <Text style={styles.recordingText}>🔴 GRAVANDO...</Text>
            </View>
          )}

        </View>
      ) : (
        // Tela principal com os botões (exibida quando o preview NÃO está ativo)
        <View style={styles.mainContent}>

          {/* Título original do aplicativo */}
          <Text style={styles.title}>Exemplo com VisionCamera - Câmera</Text>

          {/* Botão original de Tirar Foto — agora usa react-native-vision-camera */}
          <Button title="Tirar Foto" onPress={takePhoto} />

          {/* Botão original de Selecionar Foto da Galeria com margem de 10 pixels — mantido com expo-image-picker */}
          <View style={{ marginTop: 10 }}>
            <Button title="Selecionar Foto da Galeria" onPress={pickImage} />
          </View>

          {/* Botão de Gravar Vídeo (Vermelho) com margem maior de 20 pixels — agora usa react-native-vision-camera */}
          <View style={{ marginTop: 20 }}>
            <Button title="Gravar Vídeo" onPress={recordVideo} color="red" />
          </View>

          {/* Botão de Selecionar Vídeo da Galeria (Roxo) com margem de 10 pixels — mantido com expo-image-picker */}
          <View style={{ marginTop: 10 }}>
            <Button title="Selecionar Vídeo da Galeria" onPress={pickVideo} color="purple" />
          </View>

          {/* Condição: se houver mídia carregada e for foto, exibe-a com a tag Image */}
          {image && mediaType === "image" && (
            <Image source={{ uri: image }} style={styles.image} />
          )}

          {/* Condição: se for vídeo (gravado ou selecionado da galeria), exibe mensagem informativa */}
          {image && mediaType === "video" && (
            <Text style={{ marginTop: 20, fontSize: 16, color: "green", fontWeight: "bold" }}>
              Vídeo gravado ou selecionado com sucesso!
            </Text>
          )}

        </View>
      )}

    </View>
  );
}

// Cria a folha de estilos do projeto (mantendo os estilos originais e adicionando os da câmera)
const styles = StyleSheet.create({
  // Estilo do container principal que ocupa toda a tela
  container: {
    flex: 1,                  // Ocupa todo o espaço da tela
  },

  // Estilo do conteúdo principal (botões e mídia) — centralizado como no original
  mainContent: {
    flex: 1,                  // Ocupa todo o espaço disponível
    justifyContent: "center", // Centraliza os botões e títulos verticalmente
    alignItems: "center",     // Centraliza horizontalmente
    padding: 16,              // Espaçamento interno de 16 pixels nas bordas
  },

  // Estilo do título original do aplicativo
  title: {
    fontSize: 22,             // Tamanho da fonte do título como 22 pontos
    fontWeight: "bold",       // Deixa a fonte em negrito
    marginBottom: 20,         // Margem inferior de 20 pixels para separar dos botões
  },

  // Estilo original da imagem capturada ou selecionada
  image: {
    width: 300,               // Largura fixa de 300 pixels
    height: 300,              // Altura fixa de 300 pixels
    marginTop: 20,            // Margem superior de 20 pixels para separar dos botões
  },

  // Estilo do container do preview da câmera (ocupa toda a tela)
  cameraContainer: {
    flex: 1,                  // Ocupa todo o espaço da tela
    position: "relative",     // Permite posicionamento absoluto dos botões sobrepostos
  },

  // Estilo do componente Camera da vision-camera (preview em tempo real)
  camera: {
    flex: 1,                  // Ocupa todo o espaço do container
  },

  // Estilo dos botões de controle sobrepostos ao preview (troca de câmera, flash, cancelar)
  cameraControls: {
    position: "absolute",     // Posiciona os botões sobre o preview da câmera
    top: 40,                  // Distância do topo da tela
    left: 0,
    right: 0,
    flexDirection: "row",     // Organiza os botões em linha horizontal
    justifyContent: "space-around", // Distribui os botões uniformemente na linha
    paddingHorizontal: 10,    // Espaçamento horizontal interno
  },

  // Estilo individual dos botões de controle sobrepostos ao preview
  controlButton: {
    backgroundColor: "rgba(0,0,0,0.6)", // Fundo preto semitransparente para legibilidade
    paddingHorizontal: 12,              // Espaçamento horizontal interno do botão
    paddingVertical: 8,                 // Espaçamento vertical interno do botão
    borderRadius: 8,                    // Bordas arredondadas
  },

  // Estilo adicional para o botão de cancelar (cor diferenciada em vermelho)
  cancelButton: {
    backgroundColor: "rgba(200,0,0,0.7)", // Fundo vermelho semitransparente para indicar cancelamento
  },

  // Estilo do texto dos botões de controle sobrepostos ao preview
  controlButtonText: {
    color: "white",           // Texto branco para contraste com o fundo escuro
    fontSize: 13,             // Tamanho da fonte adequado para botões sobrepostos
    fontWeight: "bold",       // Texto em negrito para melhor legibilidade
  },

  // Estilo do container do botão de captura principal (parte inferior da tela)
  captureContainer: {
    position: "absolute",     // Posiciona o botão de captura sobre o preview
    bottom: 40,               // Distância do fundo da tela
    left: 0,
    right: 0,
    alignItems: "center",     // Centraliza o botão horizontalmente
  },

  // Estilo do botão principal de captura/gravação
  captureButton: {
    backgroundColor: "white",  // Fundo branco para o botão de captura
    paddingHorizontal: 30,      // Espaçamento horizontal generoso
    paddingVertical: 15,        // Espaçamento vertical generoso
    borderRadius: 50,           // Bordas completamente arredondadas (formato de pílula)
  },

  // Estilo adicional para o botão de iniciar gravação (cor verde)
  recordButton: {
    backgroundColor: "#4CAF50", // Fundo verde para indicar ação de iniciar gravação
  },

  // Estilo adicional para o botão de parar gravação (cor vermelha — feedback visual)
  stopButton: {
    backgroundColor: "#F44336", // Fundo vermelho para indicar ação de parar gravação
  },

  // Estilo do texto do botão de captura principal
  captureButtonText: {
    fontSize: 16,             // Tamanho da fonte adequado para o botão
    fontWeight: "bold",       // Texto em negrito
    color: "black",           // Texto preto para contraste com o fundo claro
  },

  // Estilo do indicador de gravação em andamento sobreposto ao preview
  recordingIndicator: {
    position: "absolute",     // Posiciona o indicador sobre o preview
    top: 100,                 // Distância do topo (abaixo dos botões de controle)
    left: 0,
    right: 0,
    alignItems: "center",     // Centraliza o indicador horizontalmente
  },

  // Estilo do texto do indicador de gravação em andamento
  recordingText: {
    color: "red",             // Texto vermelho para indicar gravação ativa
    fontSize: 18,             // Tamanho da fonte bem visível
    fontWeight: "bold",       // Texto em negrito para destaque
    backgroundColor: "rgba(0,0,0,0.5)", // Fundo semitransparente para legibilidade
    paddingHorizontal: 16,    // Espaçamento horizontal interno
    paddingVertical: 6,       // Espaçamento vertical interno
    borderRadius: 8,          // Bordas arredondadas
  },
});
