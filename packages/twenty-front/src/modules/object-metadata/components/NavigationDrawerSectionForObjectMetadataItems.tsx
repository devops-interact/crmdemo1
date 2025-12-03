import { NavigationDrawerItemForObjectMetadataItem } from '@/object-metadata/components/NavigationDrawerItemForObjectMetadataItem';
import { CoreObjectNameSingular } from '@/object-metadata/types/CoreObjectNameSingular';
import { type ObjectMetadataItem } from '@/object-metadata/types/ObjectMetadataItem';
import { getObjectPermissionsForObject } from '@/object-metadata/utils/getObjectPermissionsForObject';
import { useObjectPermissions } from '@/object-record/hooks/useObjectPermissions';
import { NavigationDrawerAnimatedCollapseWrapper } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerAnimatedCollapseWrapper';
import { NavigationDrawerSection } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSection';
import { NavigationDrawerSectionTitle } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSectionTitle';
import { useNavigationSection } from '@/ui/navigation/navigation-drawer/hooks/useNavigationSection';
import { useRecoilValue } from 'recoil';

// Orden completo de objetos en el menú lateral (estándar + personalizados)
// Usa nameSingular para objetos estándar y labelPlural para objetos personalizados
const ORDERED_MENU_OBJECTS: Array<{ nameSingular?: string; labelPlural?: string }> = [
  { nameSingular: CoreObjectNameSingular.Person }, // Clientes
  { labelPlural: 'IMSS Servicios' }, // IMSS
  { labelPlural: 'Modalidad 40 Servicios' }, // Modalidad 40
  { labelPlural: 'Préstamos' }, // Préstamos
  { labelPlural: 'Altas patronales' }, // Altas patronales
  { labelPlural: 'ISSSTE Servicios' }, // ISSSTE
  { labelPlural: 'Asistencias' }, // Asistencias
  { labelPlural: 'Legal Servicios' }, // Legal
  { labelPlural: 'Tecnología Servicios' }, // Tecnología
  { nameSingular: CoreObjectNameSingular.Task }, // Tareas
];

const ORDERED_STANDARD_OBJECTS: string[] = [
  CoreObjectNameSingular.Person,
  CoreObjectNameSingular.Company,
  CoreObjectNameSingular.Opportunity,
  CoreObjectNameSingular.Task,
  CoreObjectNameSingular.Note,
];

type NavigationDrawerSectionForObjectMetadataItemsProps = {
  sectionTitle: string;
  isRemote: boolean;
  objectMetadataItems: ObjectMetadataItem[];
};

export const NavigationDrawerSectionForObjectMetadataItems = ({
  sectionTitle,
  isRemote,
  objectMetadataItems,
}: NavigationDrawerSectionForObjectMetadataItemsProps) => {
  const { toggleNavigationSection, isNavigationSectionOpenState } =
    useNavigationSection('Objects' + (isRemote ? 'Remote' : 'Workspace'));
  const isNavigationSectionOpen = useRecoilValue(isNavigationSectionOpenState);

  const { objectPermissionsByObjectMetadataId } = useObjectPermissions();

  // Función helper para encontrar el índice de un objeto en el orden personalizado
  const getMenuOrderIndex = (item: ObjectMetadataItem): number => {
    return ORDERED_MENU_OBJECTS.findIndex((orderItem) => {
      if (orderItem.nameSingular) {
        return item.nameSingular === orderItem.nameSingular;
      }
      if (orderItem.labelPlural) {
        return item.labelPlural === orderItem.labelPlural;
      }
      return false;
    });
  };

  // Ordenar todos los objetos según el orden personalizado del menú
  const sortedObjectMetadataItems = [...objectMetadataItems].sort(
    (objectMetadataItemA, objectMetadataItemB) => {
      const indexA = getMenuOrderIndex(objectMetadataItemA);
      const indexB = getMenuOrderIndex(objectMetadataItemB);

      // Si ambos están en el orden personalizado, usar ese orden
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }

      // Si solo uno está en el orden personalizado, ponerlo primero
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      // Si ninguno está en el orden personalizado:
      // - Los objetos estándar se ordenan según ORDERED_STANDARD_OBJECTS
      // - Los objetos personalizados se ordenan por fecha de creación
      const isAStandard = ORDERED_STANDARD_OBJECTS.includes(
        objectMetadataItemA.nameSingular,
      );
      const isBStandard = ORDERED_STANDARD_OBJECTS.includes(
        objectMetadataItemB.nameSingular,
      );

      if (isAStandard && isBStandard) {
        const standardIndexA = ORDERED_STANDARD_OBJECTS.indexOf(
          objectMetadataItemA.nameSingular,
        );
        const standardIndexB = ORDERED_STANDARD_OBJECTS.indexOf(
          objectMetadataItemB.nameSingular,
        );
        return standardIndexA - standardIndexB;
      }

      if (isAStandard) return -1;
      if (isBStandard) return 1;

      // Ambos son personalizados, ordenar por fecha de creación
      return new Date(objectMetadataItemA.createdAt) <
        new Date(objectMetadataItemB.createdAt)
        ? 1
        : -1;
    },
  );

  const objectMetadataItemsForNavigationItems = sortedObjectMetadataItems;

  const objectMetadataItemsForNavigationItemsWithReadPermission =
    objectMetadataItemsForNavigationItems.filter(
      (objectMetadataItem) =>
        getObjectPermissionsForObject(
          objectPermissionsByObjectMetadataId,
          objectMetadataItem.id,
        ).canReadObjectRecords,
    );

  return (
    objectMetadataItems.length > 0 && (
      <NavigationDrawerSection>
        <NavigationDrawerAnimatedCollapseWrapper>
          <NavigationDrawerSectionTitle
            label={sectionTitle}
            onClick={() => toggleNavigationSection()}
          />
        </NavigationDrawerAnimatedCollapseWrapper>
        {isNavigationSectionOpen &&
          objectMetadataItemsForNavigationItemsWithReadPermission.map(
            (objectMetadataItem) => (
              <NavigationDrawerItemForObjectMetadataItem
                key={`navigation-drawer-item-${objectMetadataItem.id}`}
                objectMetadataItem={objectMetadataItem}
              />
            ),
          )}
      </NavigationDrawerSection>
    )
  );
};
