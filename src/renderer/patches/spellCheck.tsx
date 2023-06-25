/*
 * SPDX-License-Identifier: GPL-3.0
 * Vencord Desktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2023 Vendicated and Vencord contributors
 */

import { addContextMenuPatch } from "@vencord/types/api/ContextMenu";
import { findStoreLazy } from "@vencord/types/webpack";
import { ContextMenu, FluxDispatcher, Menu } from "@vencord/types/webpack/common";

import { addPatch } from "./shared";

let word: string;
let corrections: string[];

const SpellCheckStore = findStoreLazy("SpellcheckStore");

// Make spellcheck suggestions work
addPatch({
    patches: [
        {
            find: ".enableSpellCheck)",
            replacement: {
                // if (isDesktop) { DiscordNative.onSpellcheck(openMenu(props)) } else { e.preventDefault(); openMenu(props) }
                match: /else\{.{1,3}\.preventDefault\(\);(.{1,3}\(.{1,3}\))\}/,
                // ... else { $self.onSlateContext(() => openMenu(props)) }
                replace: "else {$self.onSlateContext(() => $1)}"
            }
        }
    ],

    onSlateContext(openMenu: () => void) {
        const cb = (w: string, c: string[]) => {
            VencordDesktopNative.spellcheck.offSpellcheckResult(cb);
            word = w;
            corrections = c;
            openMenu();
        };
        VencordDesktopNative.spellcheck.onSpellcheckResult(cb);
    }
});

addContextMenuPatch("textarea-context", children => () => {
    const hasCorrections = Boolean(word && corrections?.length);

    children.push(
        <Menu.MenuGroup>
            {hasCorrections && (
                <>
                    {corrections.map(c => (
                        <Menu.MenuItem
                            id={"vcd-spellcheck-suggestion-" + c}
                            label={c}
                            action={() => VencordDesktopNative.spellcheck.replaceMisspelling(c)}
                        />
                    ))}
                    <Menu.MenuSeparator />
                    <Menu.MenuItem
                        id="vcd-spellcheck-learn"
                        label={`Add ${word} to dictionary`}
                        action={() => VencordDesktopNative.spellcheck.addToDictionary(word)}
                    />
                </>
            )}
            <Menu.MenuCheckboxItem
                id="vcd-spellcheck-enabled"
                label="Enable Spellcheck"
                checked={SpellCheckStore.isEnabled()}
                action={() => {
                    FluxDispatcher.dispatch({ type: "SPELLCHECK_TOGGLE" });
                    // Haven't found a good way to update state, so just close for now 🤷‍♀️
                    ContextMenu.close();
                }}
            />
        </Menu.MenuGroup>
    );
});
