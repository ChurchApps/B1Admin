import { type PersonInterface } from "@churchapps/helpers";
import { PersonHelper } from "@churchapps/apphelper";

export class B1AdminPersonHelper {
  static getBirthDay(person: PersonInterface) {
    if (person?.birthDate === null) return "";
    else {
      const parts = B1AdminPersonHelper.getDateStringFromDate(person.birthDate).split(" ");

      return parts[1] + " " + parts[2];
    }
  }

  // This function assumes that the date is in the GMT timezone (no offset)
  static getDateStringFromDate(date: Date) {
    const [year, month, day] = date
      .toISOString()
      .split("T")[0]
      .split("-")
      .map((v) => +v);

    return new Date(year, month - 1, day).toDateString();
  }

  static getExpandedPersonObject(person: PersonInterface) {
    return {
      ...person,
      address: person?.contactInfo?.address1,
      city: person?.contactInfo?.city,
      state: person?.contactInfo?.state,
      zip: person?.contactInfo?.zip,
      email: person?.contactInfo?.email,
      phone: person?.contactInfo?.homePhone,
      lastName: person?.name?.last,
      firstName: person?.name?.first,
      middleName: person?.name?.middle,
      age: person?.birthDate === null ? "" : PersonHelper.getAge(person?.birthDate).split(" ")[0],
      displayName: person?.name?.display,
      birthDate: person?.birthDate ? new Date(person?.birthDate) : null,
      anniversary: person?.anniversary ? new Date(person?.anniversary) : null
    } as PersonInterface;
  }
}
