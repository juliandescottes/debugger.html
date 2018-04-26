const _path = require("path");
const fs = require("fs");

function isRequire(t, node) {
  return node && t.isCallExpression(node) && node.callee.name == "require";
}

module.exports = function({ types: t }) {
  return {
    visitor: {
      ModuleDeclaration(path, state) {
        const source = path.node.source;
        const value = source && source.value;
        if (value && value.includes(".css")) {
          path.remove();
        }
      },

      StringLiteral(path, state) {
        const { mappings, vendors, filePath } = state.opts;
        let value = path.node.value;

        if (!isRequire(t, path.parent)) {
          return;
        }

        // Transform mappings
        if (Object.keys(mappings).includes(value)) {
          path.replaceWith(t.stringLiteral(mappings[value]));
          return;
        }

        // Transform vendors
        const isVendored = vendors.some(v => value.endsWith(v));
        if (isVendored) {
          path.replaceWith(
            t.stringLiteral("devtools/client/debugger/new/vendors")
          );

          value = value.split("/").pop();

          // Transform my-vendor-name into myVendorName
          let parts = value.split("-");
          parts = parts.map((part, index) => {
            if (index === 0) {
              return part.charAt(0).toLowerCase() + part.slice(1);;
            }
            return part.charAt(0).toUpperCase() + part.slice(1);
          })
          let exportedName = parts.join("");

          path.parentPath.replaceWith(
            t.memberExpression(path.parent, t.stringLiteral(exportedName), true)
          );
          return;
        }

        const dir = _path.dirname(filePath);
        const depPath = _path.join(dir, `${value}.js`);
        const exists = fs.existsSync(depPath);
        if (
          !exists &&
          !value.endsWith("index") &&
          !value.startsWith("devtools")
        ) {
          path.replaceWith(t.stringLiteral(`${value}/index`));
          return;
        }
      }
    }
  };
};

// const Services = require("Services");
// const devtoolsModules = require("devtools/.../vendors")['devtools-modules']
// const Services = devtoolsModules;
