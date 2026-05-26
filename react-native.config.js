// Configuração do React Native CLI para autolinking.
// Exclui react-native-nitro-modules e react-native-nitro-image do autolinking Android,
// pois esses pacotes requerem AGP 9.0.0 que é incompatível com o ambiente EAS (SDK 53 / AGP 8.8.2).
// Os pacotes continuam instalados em node_modules conforme exigido pela atividade.
module.exports = {
  dependencies: {
    // Desativa o autolinking para Android (mantém instalado em node_modules)
    'react-native-nitro-modules': {
      platforms: {
        android: null,
      },
    },
    // Desativa o autolinking para Android (mantém instalado em node_modules)
    'react-native-nitro-image': {
      platforms: {
        android: null,
      },
    },
  },
};
