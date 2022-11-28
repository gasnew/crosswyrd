import { useCallback, useEffect, useRef, useState } from 'react';
import {
  uniqueNamesGenerator,
  adjectives,
  animals,
} from 'unique-names-generator';
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

declare global {
  interface Window {
    opera: string;
  }
}

// Adapted from https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser
export function isMobileOrTablet() {
  const thing = navigator.userAgent || navigator.vendor || window.opera;
  return (
    /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(
      thing
    ) ||
    //eslint-disable-next-line
    /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
      thing.substr(0, 4)
    )
  );
}

const USERNAME_SEED_STRING = 'username_seed';
export function getRandomUsername(): string {
  // Returns a random, friendly username, either given a seed previously used
  // to generate a username or with a new seed. Seeds are persisted in
  // localStorage.
  let seed = window.localStorage.getItem(USERNAME_SEED_STRING) || '';
  if (!seed) {
    seed = uuidv4();
    window.localStorage.setItem(USERNAME_SEED_STRING, seed);
  }

  return uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    separator: ' ',
    style: 'capital',
    seed,
  });
}
