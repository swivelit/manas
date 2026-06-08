import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';

type DialogActionVariant = 'default' | 'cancel' | 'destructive';

export type AppDialogAction = {
  label: string;
  variant?: DialogActionVariant;
  onPress?: () => void | Promise<void>;
};

type ShowDialogOptions = {
  title: string;
  message?: string;
  actions?: AppDialogAction[];
};

type ConfirmDialogOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type DialogState = ShowDialogOptions & {
  actions: AppDialogAction[];
};

type DialogContextValue = {
  show: (options: ShowDialogOptions) => Promise<void>;
  alert: (title: string, message?: string) => Promise<void>;
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

const DEFAULT_ACTION: AppDialogAction = { label: 'OK' };

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resolverRef = useRef<((value: unknown) => void) | null>(null);

  const close = useCallback((value: unknown) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setDialog(null);
    resolve?.(value);
  }, []);

  const show = useCallback((options: ShowDialogOptions) => new Promise<void>(resolve => {
    const actions = (options.actions?.length ? options.actions : [DEFAULT_ACTION]).slice(0, 2);
    resolverRef.current = () => resolve();
    setDialog({ ...options, actions });
  }), []);

  const alert = useCallback((title: string, message?: string) => show({ title, message }), [show]);

  const confirm = useCallback((options: ConfirmDialogOptions) => new Promise<boolean>(resolve => {
    resolverRef.current = (value: unknown) => resolve(Boolean(value));
    setDialog({
      title: options.title,
      message: options.message,
      actions: [
        { label: options.cancelLabel ?? 'Cancel', variant: 'cancel', onPress: () => close(false) },
        {
          label: options.confirmLabel ?? 'OK',
          variant: options.destructive ? 'destructive' : 'default',
          onPress: () => close(true),
        },
      ],
    });
  }), [close]);

  const value = useMemo<DialogContextValue>(() => ({ show, alert, confirm }), [show, alert, confirm]);

  async function handleAction(action: AppDialogAction) {
    if (action.onPress) {
      await action.onPress();
      if (!resolverRef.current) return;
    }
    close(undefined);
  }

  return (
    <DialogContext.Provider value={value}>
      {children}
      <Modal visible={!!dialog} transparent animationType="fade" statusBarTranslucent onRequestClose={() => close(false)}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.title}>{dialog?.title}</Text>
            {dialog?.message ? <Text style={styles.message}>{dialog.message}</Text> : null}
            <View style={styles.actions}>
              {dialog?.actions.map((action, index) => {
                const destructive = action.variant === 'destructive';
                const cancel = action.variant === 'cancel';
                return (
                  <TouchableOpacity
                    key={`${action.label}-${index}`}
                    style={[
                      styles.button,
                      cancel ? styles.cancelButton : styles.primaryButton,
                      destructive && styles.destructiveButton,
                    ]}
                    activeOpacity={0.86}
                    onPress={() => { void handleAction(action); }}
                  >
                    <Text style={[
                      styles.buttonText,
                      cancel ? styles.cancelText : styles.primaryText,
                      destructive && styles.destructiveText,
                    ]}>
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const dialog = useContext(DialogContext);
  if (!dialog) {
    throw new Error('useDialog must be used inside DialogProvider');
  }
  return dialog;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(26,28,46,0.42)',
  },
  card: {
    backgroundColor: colors.paper,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 20,
    shadowColor: colors.ink,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  title: {
    fontFamily: fontFamilies.frauncesMedium,
    fontSize: 22,
    color: colors.ink,
    letterSpacing: 0,
  },
  message: {
    fontFamily: fontFamilies.dmSans,
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkSoft,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  button: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  primaryButton: {
    backgroundColor: colors.ink,
  },
  cancelButton: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
  },
  destructiveButton: {
    backgroundColor: colors.pink,
  },
  buttonText: {
    fontFamily: fontFamilies.dmSansMedium,
    fontSize: 14,
    textAlign: 'center',
  },
  primaryText: {
    color: colors.cream,
  },
  cancelText: {
    color: colors.ink,
  },
  destructiveText: {
    color: colors.cream,
  },
});
