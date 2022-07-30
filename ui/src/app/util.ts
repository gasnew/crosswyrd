import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef<() => void>();

  // Remember the latest callback.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      if (savedCallback.current) savedCallback.current();
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

export function getEnv(variableName: string): string {
  const fullName = `REACT_APP_${variableName}`;
  const variable = process.env[fullName];
  if (!variable) throw new Error(`No environment variable called ${fullName}!`);
  if (!(typeof variable === 'string'))
    throw new Error(`Environment variable ${fullName} is not a string!`);

  return variable;
}

export function devMode(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function apiUrl(): string {
  return devMode()
    ? `http://${window.location.hostname}:8000/graphql`
    : getEnv('API_URL');
}

export function sleep(ms: number): Promise<any> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface AlertReturnType {
  withAlert: (func: () => any) => () => any;
  onConfirm: () => void;
  onCancel: () => void;
  isOpen: boolean;
}
export function useAlert(): AlertReturnType {
  const [isOpen, setIsOpen] = useState(false);
  const [onConfirm, setOnConfirm] = useState<() => void>(() => () => undefined);
  const [onCancel, setOnCancel] = useState<() => void>(() => () => undefined);

  const withAlert = useCallback((func) => {
    return async (...args) => {
      const userConfirmation = new Promise<void>((resolve, reject) => {
        setOnConfirm(() => () => resolve());
        setOnCancel(() => () => reject());
      });

      setIsOpen(true);
      try {
        await userConfirmation;
        setIsOpen(false);
        func(...args);
      } catch {
        setIsOpen(false);
      }
      setOnConfirm(() => () => undefined);
      setOnCancel(() => () => undefined);
    };
  }, []);

  return {
    withAlert,
    onConfirm,
    onCancel,
    isOpen,
  };
}

export function randomId(): string {
  return uuidv4();
}
