import type { Language } from '../core/playerSave.ts';

export interface SoldierProfileText {
  hometown: string;
  occupation: string;
  family: string;
  story: string;
  personalDetail: string;
}
export interface SoldierProfile {
  id: string;
  name: string;
  age: number;
  portrait: string;
  text: Record<Language, SoldierProfileText>;
}

/** Entirely fictional biographies, stored locally; portraits are optional. */
export const SOLDIER_PROFILES: readonly SoldierProfile[] = [
  {
    id: 'andriy', name: 'Andriy Kovalenko', age: 34, portrait: '/infantry-profiles/andriy.png',
    text: {
      tr: {
        hometown: 'Poltava', occupation: 'Fizik öğretmeni',
        family: 'Eşi Olena, 33. Kızı Sofiia, 9; oğlu Maksym, 5.',
        story: 'Derste zor bir soruyu anlatırken önce pencereyi açardı. Sofiia ile mutfak masasında küçük deneyler yaparlardı. Maksym henüz babasının neden her gün eve dönmediğini anlamıyordu.',
        personalDetail: 'Son mesajı: “Olena, balkondaki fideleri içeri almayı unutma.”',
      },
      en: {
        hometown: 'Poltava', occupation: 'Physics teacher',
        family: 'Wife Olena, 33. Daughter Sofiia, 9; son Maksym, 5.',
        story: 'Before explaining a difficult problem, he would open the classroom window. He and Sofiia built little experiments on the kitchen table. Maksym did not yet understand why his father no longer came home every day.',
        personalDetail: 'Last message: “Olena, remember to bring the seedlings in from the balcony.”',
      },
    },
  },
  {
    id: 'oleksandr', name: 'Oleksandr Melnyk', age: 22, portrait: '/infantry-profiles/oleksandr.png',
    text: {
      tr: {
        hometown: 'Kharkiv', occupation: 'Mimarlık öğrencisi',
        family: 'Çocuğu yok. Annesi Iryna, 48; kız arkadaşı Daria, 22, onu bekliyordu.',
        story: 'Defterlerinin kenarlarına ev cepheleri çizerdi. Bir gün annesi için merdivensiz küçük bir ev yapmak istiyordu. Daria, birlikte bitirecekleri maketin parçalarını bir kutuda saklıyordu.',
        personalDetail: 'Telefon notu: “Daria’ya çizimleri göstermeyi unutma.”',
      },
      en: {
        hometown: 'Kharkiv', occupation: 'Architecture student',
        family: 'No children. His mother Iryna, 48, and girlfriend Daria, 22, were waiting for him.',
        story: 'He drew house fronts in the margins of his notebooks. One day he wanted to build his mother a small house without stairs. Daria kept the pieces of their unfinished model in a box.',
        personalDetail: 'Phone note: “Remember to show Daria the drawings.”',
      },
    },
  },
  {
    id: 'taras', name: 'Taras Bondar', age: 41, portrait: '/infantry-profiles/taras.png',
    text: {
      tr: {
        hometown: 'Zaporizhzhia', occupation: 'Kaynakçı',
        family: 'Eşi Oksana, 39. Çocukları Artem, 16; Kateryna, 12; Danylo, 7.',
        story: 'Komşuların kırık kapılarını çoğu zaman para almadan onarırdı. Hafta sonları çocuklarıyla nehir kıyısına giderdi. Evdeki alet çekmecesinde her çocuğunun yaptığı küçük bir eşya duruyordu.',
        personalDetail: 'Son mesajı: “Danylo’nun bisikletine dokunmayın, dönünce birlikte yapacağız.”',
      },
      en: {
        hometown: 'Zaporizhzhia', occupation: 'Welder',
        family: 'Wife Oksana, 39. Children Artem, 16; Kateryna, 12; Danylo, 7.',
        story: 'He often repaired his neighbours’ broken gates without asking for payment. On weekends he took the children to the river. His tool drawer held a small object made by each of them.',
        personalDetail: 'Last message: “Leave Danylo’s bicycle for now. We’ll fix it together when I’m back.”',
      },
    },
  },
  {
    id: 'ivan', name: 'Ivan Hrytsenko', age: 28, portrait: '/infantry-profiles/ivan.png',
    text: {
      tr: {
        hometown: 'Chernihiv', occupation: 'Köy fırıncısı',
        family: 'Eşi Mariia, 27. Yeni doğmuş kızı Lilia, 1 aylık.',
        story: 'Gün doğmadan fırını açar, ilk ekmeği eve ayırırdı. Kızı Lilia’yı yalnızca bir kez kucağına alabildi. O gün çekilen fotoğrafın bir kopyasını ceketinin iç cebinde taşıyordu.',
        personalDetail: 'Son mesajı: “Bugün de fotoğrafını gönder, uyanık olmasına gerek yok.”',
      },
      en: {
        hometown: 'Chernihiv', occupation: 'Village baker',
        family: 'Wife Mariia, 27. Newborn daughter Lilia, 1 month old.',
        story: 'He opened the bakery before sunrise and set aside the first loaf for home. He held his daughter Lilia only once. A copy of the photograph from that day stayed in his inside jacket pocket.',
        personalDetail: 'Last message: “Send me another picture today. She doesn’t have to be awake.”',
      },
    },
  },
  {
    id: 'mykola', name: 'Mykola Tkachenko', age: 52, portrait: '/infantry-profiles/mykola.png',
    text: {
      tr: {
        hometown: 'Vinnytsia', occupation: 'Çiftçi',
        family: 'Eşi Halyna, 51. Oğulları Petro, 29; Serhii, 25. Torunu Anna, 4.',
        story: 'Yağmurun ne zaman geleceğini çoğu zaman bulutlardan anlardı. İki oğlu başka işlere girse de hasatta hep eve dönerdi. Anna için bahçeye diktiği elma ağacı henüz meyve vermemişti.',
        personalDetail: 'Cebindeki liste: “Elma fidanına destek kazığı. Anna’ya sarı kalem.”',
      },
      en: {
        hometown: 'Vinnytsia', occupation: 'Farmer',
        family: 'Wife Halyna, 51. Sons Petro, 29; Serhii, 25. Granddaughter Anna, 4.',
        story: 'He could usually tell from the clouds when rain was coming. His two sons found other work, but always came home for the harvest. The apple tree he planted for Anna had not yet borne fruit.',
        personalDetail: 'List in his pocket: “Stake for the apple sapling. Yellow pencil for Anna.”',
      },
    },
  },
];

export function soldierProfileAt(spawnIndex: number): SoldierProfile {
  return SOLDIER_PROFILES[spawnIndex % SOLDIER_PROFILES.length];
}
