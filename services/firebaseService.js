import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { ref, getDownloadURL, listAll } from 'firebase/storage';
import { db, storage } from '../firebase';

export class FirebaseService {
  // Obtener todos los días del calendario
  static async getDays() {
    try {
      const querySnapshot = await getDocs(collection(db, 'days'));
      const days = [];
      querySnapshot.forEach((doc) => {
        days.push({ id: doc.id, ...doc.data() });
      });
      return days.sort((a, b) => b.dayNumber - a.dayNumber); // Orden inverso: de mayor a menor
    } catch (error) {
      console.error('Error obteniendo días:', error);
      throw error;
    }
  }

  // Obtener un día específico
  static async getDay(dayNumber) {
    try {
      const dayRef = doc(db, 'days', dayNumber.toString());
      const daySnap = await getDoc(dayRef);
      
      if (daySnap.exists()) {
        return { id: daySnap.id, ...daySnap.data() };
      } else {
        throw new Error('Día no encontrado');
      }
    } catch (error) {
      console.error('Error obteniendo día:', error);
      throw error;
    }
  }

  // Obtener URL de imagen desde Firebase Storage o URL externa
  static async getImageUrl(imagePath) {
    try {
      if (!imagePath || typeof imagePath !== 'string') {
        // Si no hay ruta válida, devuelve una imagen de respaldo
        return 'https://via.placeholder.com/400x400/cccccc/ffffff?text=Imagen+no+disponible';
      }
      // Si es una URL completa, usarla directamente
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
      }
      // Si es una ruta de Firebase Storage, obtener URL
      const imageRef = ref(storage, imagePath);
      const url = await getDownloadURL(imageRef);
      return url;
    } catch (error) {
      console.error('Error obteniendo URL de imagen:', error);
      // Devuelve una imagen de respaldo si falla
      return 'https://via.placeholder.com/400x400/cccccc/ffffff?text=Imagen+no+disponible';
    }
  }

  // Obtener múltiples URLs de imágenes para un día específico
  static async getDayPhotos(dayNumber) {
    try {
      const photos = [];
      
      // Primero obtener la imagen principal del día
      const day = await this.getDay(dayNumber);
      if (day.imagePath) {
        const mainImageUrl = await this.getImageUrl(day.imagePath);
        photos.push(mainImageUrl);
      }
      
      // Buscar fotos adicionales dinámicamente
      const additionalPhotos = await this.getAdditionalPhotos(dayNumber);
      photos.push(...additionalPhotos);

      // Si no se encontró ninguna imagen, devolver imagen de respaldo
      if (photos.length === 0) {
        photos.push('https://via.placeholder.com/400x400/cccccc/ffffff?text=Sin+fotos');
      }

      return photos;
    } catch (error) {
      console.error('Error obteniendo fotos del día:', error);
      // Devolver imagen de respaldo
      return ['https://via.placeholder.com/400x400/cccccc/ffffff?text=Error+cargando+fotos'];
    }
  }

  // Obtener fotos adicionales dinámicamente
  static async getAdditionalPhotos(dayNumber) {
    try {
      const additionalPhotos = [];
      const folderPath = `photos/day${dayNumber}`;
      const folderRef = ref(storage, folderPath);
      
      // Listar todos los archivos en la carpeta
      const result = await listAll(folderRef);
      
      // Obtener URLs para cada archivo encontrado
      const urlPromises = result.items.map(async (item) => {
        try {
          const url = await getDownloadURL(item);
          return url;
        } catch (error) {
          console.log(`Error obteniendo URL para ${item.name}:`, error);
          return null;
        }
      });
      
      // Esperar todas las URLs y filtrar las que fallaron
      const urls = await Promise.all(urlPromises);
      const validUrls = urls.filter(url => url !== null);
      
      return validUrls;
    } catch (error) {
      console.log(`No se encontró la carpeta photos/day${dayNumber} o está vacía`);
      return [];
    }
  }

  // Obtener URL de audio desde Firebase Storage o URL externa
  static async getAudioUrl(audioPath) {
    try {
      if (!audioPath || typeof audioPath !== 'string') {
        // Si no hay ruta válida, devuelve null
        return null;
      }
      // Si es una URL completa, usarla directamente
      if (audioPath.startsWith('http://') || audioPath.startsWith('https://')) {
        return audioPath;
      }
      // Si es una ruta de Firebase Storage, obtener URL
      const audioRef = ref(storage, audioPath);
      const url = await getDownloadURL(audioRef);
      return url;
    } catch (error) {
      console.error('Error obteniendo URL de audio:', error);
      // Devuelve null si falla
      return null;
    }
  }

  // Obtener todos los datos necesarios para un día
  static async getDayData(dayNumber) {
    try {
      const day = await this.getDay(dayNumber);
      
      // Obtener URLs de imagen y audio
      const imageUrl = await this.getImageUrl(day.imagePath);
      const audioUrl = day.audioPath ? await this.getAudioUrl(day.audioPath) : null;
      
      return {
        ...day,
        imageUrl,
        audioUrl
      };
    } catch (error) {
      console.error('Error obteniendo datos del día:', error);
      throw error;
    }
  }

  // Obtener todos los días con sus URLs
  static async getAllDaysWithUrls() {
    try {
      const days = await this.getDays();
      const daysWithUrls = await Promise.all(
        days.map(async (day) => {
          try {
            const imageUrl = await this.getImageUrl(day.imagePath);
            const audioUrl = day.audioPath ? await this.getAudioUrl(day.audioPath) : null;
            const photos = await this.getDayPhotos(day.dayNumber);
            
            return {
              ...day,
              imageUrl,
              audioUrl,
              photos
            };
          } catch (error) {
            console.error(`Error procesando día ${day.dayNumber}:`, error);
            return day;
          }
        })
      );
      
      return daysWithUrls;
    } catch (error) {
      console.error('Error obteniendo todos los días:', error);
      throw error;
    }
  }

  // Método alternativo: usar datos de ejemplo si Firebase no funciona
  static async getFallbackData() {
    const fallbackDays = [
      {
        dayNumber: 31,
        text: "¡Comienza la cuenta regresiva hacia tu cumpleaños! Cada día será una nueva sorpresa.",
        imageUrl: "https://via.placeholder.com/400x400/ff6b6b/ffffff?text=Día+31",
        audioUrl: null,
        photos: [
          "https://via.placeholder.com/400x400/ff6b6b/ffffff?text=Imagen+Principal+Día+31",
          "https://via.placeholder.com/400x400/6a11cb/ffffff?text=Foto+Adicional+1+Día+31",
          "https://via.placeholder.com/400x400/2575fc/ffffff?text=Foto+Adicional+2+Día+31"
        ]
      },
      {
        dayNumber: 30,
        text: "Hoy es el primer día de nuestro camino hacia tu cumpleaños. Cada día será especial y lleno de sorpresas.",
        imageUrl: "https://via.placeholder.com/400x400/6a11cb/ffffff?text=Día+30",
        audioUrl: null,
        photos: [
          "https://via.placeholder.com/400x400/6a11cb/ffffff?text=Imagen+Principal+Día+30",
          "https://via.placeholder.com/400x400/2575fc/ffffff?text=Foto+Adicional+1+Día+30",
          "https://via.placeholder.com/400x400/ff6b6b/ffffff?text=Foto+Adicional+2+Día+30"
        ]
      },
      {
        dayNumber: 29,
        text: "El segundo día nos trae nuevas emociones y recuerdos que compartir.",
        imageUrl: "https://via.placeholder.com/400x400/2575fc/ffffff?text=Día+29",
        audioUrl: null,
        photos: [
          "https://via.placeholder.com/400x400/2575fc/ffffff?text=Imagen+Principal+Día+29",
          "https://via.placeholder.com/400x400/6a11cb/ffffff?text=Foto+Adicional+1+Día+29",
          "https://via.placeholder.com/400x400/ff6b6b/ffffff?text=Foto+Adicional+2+Día+29"
        ]
      },
      // Agrega más días según necesites...
    ];
    
    return fallbackDays;
  }
} 