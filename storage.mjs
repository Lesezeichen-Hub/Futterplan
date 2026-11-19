import { empty } from './model.mjs';

export function connect() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('lesezeichen-hub.futterplan', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Bitte andere Futterplan-Tabs schließen und neu laden.'));
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
  });
}

export function load(database) {
  return new Promise((resolve, reject) => {
    const request = database.transaction('state').objectStore('state').get('data');
    request.onsuccess = () => resolve(request.result ?? empty());
    request.onerror = () => reject(request.error);
  });
}

export function change(database, update) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('state', 'readwrite');
    const store = transaction.objectStore('state');
    const request = store.get('data');
    let data;
    let failure;
    request.onsuccess = () => {
      try {
        data = update(request.result ?? empty());
        store.put(data, 'data');
      } catch (error) {
        failure = error;
        transaction.abort();
      }
    };
    transaction.onabort = () => reject(failure ?? transaction.error);
    transaction.oncomplete = () => resolve(data);
  });
}