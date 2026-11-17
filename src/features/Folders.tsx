import { validIcon } from '../utils/icons';
import type { IconName } from '../components/ui';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { router } from 'expo-router';
import { useMemory, useTheme } from '../hooks/useMemory';
import {
  Copy,
  Empty,
  ErrorMessage,
  Header,
  IconButton,
  Screen,
  confirm,
  s,
} from '../components/ui';
import { ChoiceSheet, SelectionRow } from '../components/controls';
import { FolderEditor } from '../components/FolderEditor';
import { OverflowMenu } from '../components/OverflowMenu';
import { ItemBrowser } from './ItemBrowser';
import { folderPath, inFolder } from '../utils/folders';
export function Folders({
  id,
  unfiled = false,
}: {
  id?: string;
  unfiled?: boolean;
}) {
  const { data, repository } = useMemory();
  const { colors } = useTheme();
  const folder = data.folders.find((f) => f.id === id);
  const [editor, setEditor] = useState<'new' | 'edit'>();
  const [add, setAdd] = useState(false);
  const [existing, setExisting] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const children = data.folders
    .filter((f) => !unfiled && f.parentId === id)
    .sort((a, b) => a.name.localeCompare(b.name));
  const pinned = data.settings.quickAccess.some(
    (ref) => ref.kind === 'folder' && ref.id === id,
  );
  const run = (action: Promise<unknown>) => {
    setError(undefined);
    void action.catch((e) => setError(e.message));
  };
  const capture = () =>
    router.push({ pathname: '/capture', params: { folderId: id ?? '' } });
  const renderFolder = (child: (typeof data.folders)[number]) => {
    const count = data.items.filter(
      (item) =>
        !item.isArchived &&
        !item.deletedAt &&
        inFolder(item.folderId, child.id, data.folders),
    ).length;
    return (
      <View
        style={{
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: 14,
        }}
      >
        <SelectionRow
          title={child.name}
          subtitle={`${count} ${count === 1 ? 'item' : 'items'} including subfolders`}
          icon={validIcon(child.icon, 'folder-outline') as IconName}
          onPress={() =>
            router.push({ pathname: '/folders/[id]', params: { id: child.id } })
          }
        />
      </View>
    );
  };
  if (id && !folder)
    return (
      <Screen>
        <Header title="Folders" />
        <Empty title="Folder unavailable" message="Choose another folder." />
      </Screen>
    );
  return (
    <Screen scroll={false}>
      <Header
        title={unfiled ? 'Unfiled' : (folder?.name ?? 'Folders')}
        right={
          <View style={[s.row, { gap: 8 }]}>
            <IconButton
              icon="add"
              label={folder || unfiled ? 'Add to folder' : 'New folder'}
              onPress={() =>
                folder || unfiled ? setAdd(true) : setEditor('new')
              }
            />
            {folder && (
              <OverflowMenu
                title="Folder"
                options={[
                  {
                    value: 'edit',
                    label: 'Rename or move folder',
                    icon: 'create-outline',
                  },
                  {
                    value: 'pin',
                    label: pinned ? 'Remove from Quick Access' : 'Pin to Home',
                    icon: 'pin-outline',
                  },
                  {
                    value: 'delete',
                    label: 'Delete folder',
                    icon: 'trash-outline',
                  },
                ]}
                onSelect={(value) => {
                  if (value === 'edit') setEditor('edit');
                  if (value === 'pin')
                    run(
                      repository
                        .toggleShortcut({ kind: 'folder', id: folder.id })
                        .then(() =>
                          setNotice(
                            pinned ? 'Shortcut removed.' : 'Pinned to Home.',
                          ),
                        ),
                    );
                  if (value === 'delete')
                    void confirm(
                      `Delete ${folder.name}?`,
                      'Items and subfolders move to its parent or Unfiled. No items or photos will be deleted.',
                    ).then((yes) => {
                      if (yes)
                        run(
                          repository
                            .deleteFolder(folder.id)
                            .then(() => router.replace('/folders')),
                        );
                    });
                }}
              />
            )}
          </View>
        }
      />
      <Copy muted style={{ fontSize: 12 }}>
        {folder
          ? folderPath(id, data.folders)
          : unfiled
            ? 'Items without a folder. They still have their saved physical locations.'
            : 'Your own groups. Physical locations stay the same.'}
      </Copy>
      <ErrorMessage message={error} />
      {notice && <Copy style={{ fontSize: 12 }}>{notice}</Copy>}
      {!folder && !unfiled ? (
        <FlatList
          data={children}
          keyExtractor={(f) => f.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
          ListHeaderComponent={
            <SelectionRow
              title="Unfiled"
              subtitle={`${data.items.filter((item) => !item.isArchived && !item.deletedAt && !item.folderId).length} items without a folder`}
              icon="folder-open-outline"
              onPress={() => router.push('/folders/unfiled')}
            />
          }
          renderItem={({ item }) => renderFolder(item)}
          ListEmptyComponent={
            <Empty
              title="Folders are optional."
              message="Use + to make a group such as Travel or Camping. Items can stay Unfiled for as long as you like."
            />
          }
        />
      ) : (
        <ItemBrowser
          forceList
          scopeFolderId={unfiled ? 'unfiled' : id}
          leading={children.map((child) => ({
            id: child.id,
            render: () => renderFolder(child),
          }))}
          onAdd={capture}
          emptyMessage="Use + to remember a new item here or add an existing one."
        />
      )}
      {editor && (
        <FolderEditor
          id={editor === 'edit' ? id : undefined}
          parentId={editor === 'new' ? id : undefined}
          onClose={() => setEditor(undefined)}
        />
      )}
      <ChoiceSheet
        visible={add}
        title="Add to folder"
        options={[
          {
            value: 'new',
            label: 'Remember a new item',
            icon: 'camera-outline',
          },
          {
            value: 'existing',
            label: 'Add an existing item',
            icon: 'add-circle-outline',
          },
          ...(!unfiled
            ? [
                {
                  value: 'folder',
                  label: 'Create subfolder',
                  icon: 'folder-outline' as const,
                },
              ]
            : []),
        ]}
        onClose={() => setAdd(false)}
        onSelect={(value) => {
          if (value === 'new') capture();
          else if (value === 'existing') setExisting(true);
          else setEditor('new');
        }}
      />
      <ChoiceSheet
        visible={existing}
        title={unfiled ? 'Remove from a folder' : 'Add an existing item'}
        searchable
        options={data.items
          .filter(
            (item) =>
              !item.isArchived && !item.deletedAt && item.folderId !== id,
          )
          .map((item) => ({
            value: item.id,
            label: item.name,
            detail: folderPath(item.folderId, data.folders) || 'Unfiled',
          }))}
        onClose={() => setExisting(false)}
        onSelect={(itemId) => {
          const item = data.items.find((i) => i.id === itemId);
          if (item)
            run(repository.saveItem({ ...item, folderId: id }, item.id));
        }}
      />
    </Screen>
  );
}
