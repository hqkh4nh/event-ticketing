import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

const DISCOVERY_CITY_STORAGE_KEY = 'discovery.selectedCity';

function normalizeCity(city: string | null): string | null {
  const normalized = city?.trim();
  return normalized || null;
}

export function useDiscoveryCity(): {
  selectedCity: string | null;
  setSelectedCity: (city: string | null) => void;
  isHydrated: boolean;
} {
  const [selectedCity, setSelectedCityState] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const hasLocalSelection = useRef(false);

  useEffect(() => {
    let isMounted = true;

    void AsyncStorage.getItem(DISCOVERY_CITY_STORAGE_KEY)
      .then((storedCity) => {
        if (isMounted && !hasLocalSelection.current) {
          setSelectedCityState(normalizeCity(storedCity));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) setIsHydrated(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const setSelectedCity = useCallback((city: string | null) => {
    const nextCity = normalizeCity(city);
    hasLocalSelection.current = true;
    setSelectedCityState(nextCity);

    const persist = nextCity
      ? AsyncStorage.setItem(DISCOVERY_CITY_STORAGE_KEY, nextCity)
      : AsyncStorage.removeItem(DISCOVERY_CITY_STORAGE_KEY);

    void persist.catch(() => undefined);
  }, []);

  return { selectedCity, setSelectedCity, isHydrated };
}
