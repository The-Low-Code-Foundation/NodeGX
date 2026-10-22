/**
 * EXP-022. The one Xcode project file the app needs: an iOS app target whose only source is `App/<Name>App.swift`, and
 * which depends on the Swift package beside it (`Package.swift`, where every view lives).
 *
 * Why a project file at all: a Swift package builds and tests on macOS (`swift build`, `swift test`) but cannot make an
 * installable iOS `.app`; an app target can. The package keeps everything a person edits, and this file is the thin
 * wrapper Xcode and `xcodebuild` open. Object ids are derived from their names, so the same project prints the same file.
 *
 * @module emit/swift/xcodeproj
 */

import { createHash } from 'crypto';

function id(key: string): string {
  return createHash('md5').update(`nodegx-swift:${key}`).digest('hex').slice(0, 24).toUpperCase();
}

export interface XcodeProjectInput {
  /** `StoryEngine` — the app target and product name. */
  appName: string;
  /** The library product of `Package.swift`. */
  libraryName: string;
  bundleId: string;
}

export function projectPbxproj({ appName, libraryName, bundleId }: XcodeProjectInput): string {
  const I = {
    project: id('project'),
    mainGroup: id('mainGroup'),
    appGroup: id('appGroup'),
    productsGroup: id('productsGroup'),
    appFile: id('appFile'),
    appBuildFile: id('appBuildFile'),
    product: id('product'),
    target: id('target'),
    sources: id('sources'),
    frameworks: id('frameworks'),
    resources: id('resources'),
    libBuildFile: id('libBuildFile'),
    pkgRef: id('pkgRef'),
    pkgDep: id('pkgDep'),
    projConfigs: id('projConfigs'),
    projDebug: id('projDebug'),
    projRelease: id('projRelease'),
    targetConfigs: id('targetConfigs'),
    targetDebug: id('targetDebug'),
    targetRelease: id('targetRelease')
  };
  const appSwift = `${appName}App.swift`;
  const projSettings = (debug: boolean) => `
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_ENABLE_MODULES = YES;
				${debug ? 'DEBUG_INFORMATION_FORMAT = dwarf;' : 'DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";'}
				ENABLE_STRICT_OBJC_MSGSEND = YES;
				${debug ? 'ENABLE_TESTABILITY = YES;' : ''}
				GCC_C_LANGUAGE_STANDARD = gnu17;
				IPHONEOS_DEPLOYMENT_TARGET = 17.0;
				${debug ? 'ONLY_ACTIVE_ARCH = YES;' : ''}
				SDKROOT = iphoneos;
				${debug ? 'SWIFT_ACTIVE_COMPILATION_CONDITIONS = "DEBUG $(inherited)";' : ''}
				SWIFT_OPTIMIZATION_LEVEL = "${debug ? '-Onone' : '-O'}";
				${debug ? '' : 'VALIDATE_PRODUCT = YES;'}`
    .split('\n')
    .filter((l) => l.trim() !== '')
    .join('\n');
  const targetSettings = `
				CODE_SIGN_STYLE = Automatic;
				CURRENT_PROJECT_VERSION = 1;
				GENERATE_INFOPLIST_FILE = YES;
				INFOPLIST_KEY_CFBundleDisplayName = "${appName}";
				INFOPLIST_KEY_UIApplicationSceneManifest_Generation = YES;
				INFOPLIST_KEY_UILaunchScreen_Generation = YES;
				INFOPLIST_KEY_UISupportedInterfaceOrientations = UIInterfaceOrientationPortrait;
				LD_RUNPATH_SEARCH_PATHS = (
					"$(inherited)",
					"@executable_path/Frameworks",
				);
				MARKETING_VERSION = 1.0;
				PRODUCT_BUNDLE_IDENTIFIER = ${bundleId};
				PRODUCT_NAME = "$(TARGET_NAME)";
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = 1;`
    .split('\n')
    .filter((l) => l.trim() !== '')
    .join('\n');

  return `// !$*UTF8*$!
{
	archiveVersion = 1;
	classes = {
	};
	objectVersion = 60;
	objects = {

/* Begin PBXBuildFile section */
		${I.appBuildFile} /* ${appSwift} in Sources */ = {isa = PBXBuildFile; fileRef = ${I.appFile} /* ${appSwift} */; };
		${I.libBuildFile} /* ${libraryName} in Frameworks */ = {isa = PBXBuildFile; productRef = ${I.pkgDep} /* ${libraryName} */; };
/* End PBXBuildFile section */

/* Begin PBXFileReference section */
		${I.appFile} /* ${appSwift} */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ${appSwift}; sourceTree = "<group>"; };
		${I.product} /* ${appName}.app */ = {isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = ${appName}.app; sourceTree = BUILT_PRODUCTS_DIR; };
/* End PBXFileReference section */

/* Begin PBXFrameworksBuildPhase section */
		${I.frameworks} /* Frameworks */ = {
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
				${I.libBuildFile} /* ${libraryName} in Frameworks */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
		${I.mainGroup} = {
			isa = PBXGroup;
			children = (
				${I.appGroup} /* App */,
				${I.productsGroup} /* Products */,
			);
			sourceTree = "<group>";
		};
		${I.appGroup} /* App */ = {
			isa = PBXGroup;
			children = (
				${I.appFile} /* ${appSwift} */,
			);
			path = App;
			sourceTree = "<group>";
		};
		${I.productsGroup} /* Products */ = {
			isa = PBXGroup;
			children = (
				${I.product} /* ${appName}.app */,
			);
			name = Products;
			sourceTree = "<group>";
		};
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
		${I.target} /* ${appName} */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = ${I.targetConfigs} /* Build configuration list for PBXNativeTarget "${appName}" */;
			buildPhases = (
				${I.sources} /* Sources */,
				${I.frameworks} /* Frameworks */,
				${I.resources} /* Resources */,
			);
			buildRules = (
			);
			dependencies = (
			);
			name = ${appName};
			packageProductDependencies = (
				${I.pkgDep} /* ${libraryName} */,
			);
			productName = ${appName};
			productReference = ${I.product} /* ${appName}.app */;
			productType = "com.apple.product-type.application";
		};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
		${I.project} /* Project object */ = {
			isa = PBXProject;
			attributes = {
				BuildIndependentTargetsInParallel = 1;
				LastSwiftUpdateCheck = 1500;
				LastUpgradeCheck = 1500;
			};
			buildConfigurationList = ${I.projConfigs} /* Build configuration list for PBXProject "${appName}" */;
			compatibilityVersion = "Xcode 15.0";
			developmentRegion = en;
			hasScannedForEncodings = 0;
			knownRegions = (
				en,
				Base,
			);
			mainGroup = ${I.mainGroup};
			packageReferences = (
				${I.pkgRef} /* XCLocalSwiftPackageReference "." */,
			);
			productRefGroup = ${I.productsGroup} /* Products */;
			projectDirPath = "";
			projectRoot = "";
			targets = (
				${I.target} /* ${appName} */,
			);
		};
/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
		${I.resources} /* Resources */ = {
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXResourcesBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
		${I.sources} /* Sources */ = {
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				${I.appBuildFile} /* ${appSwift} in Sources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXSourcesBuildPhase section */

/* Begin XCBuildConfiguration section */
		${I.projDebug} /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
${projSettings(true)}
			};
			name = Debug;
		};
		${I.projRelease} /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
${projSettings(false)}
			};
			name = Release;
		};
		${I.targetDebug} /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
${targetSettings}
			};
			name = Debug;
		};
		${I.targetRelease} /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
${targetSettings}
			};
			name = Release;
		};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		${I.projConfigs} /* Build configuration list for PBXProject "${appName}" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				${I.projDebug} /* Debug */,
				${I.projRelease} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
		${I.targetConfigs} /* Build configuration list for PBXNativeTarget "${appName}" */ = {
			isa = XCConfigurationList;
			buildConfigurations = (
				${I.targetDebug} /* Debug */,
				${I.targetRelease} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
/* End XCConfigurationList section */

/* Begin XCLocalSwiftPackageReference section */
		${I.pkgRef} /* XCLocalSwiftPackageReference "." */ = {
			isa = XCLocalSwiftPackageReference;
			relativePath = .;
		};
/* End XCLocalSwiftPackageReference section */

/* Begin XCSwiftPackageProductDependency section */
		${I.pkgDep} /* ${libraryName} */ = {
			isa = XCSwiftPackageProductDependency;
			productName = ${libraryName};
		};
/* End XCSwiftPackageProductDependency section */
	};
	rootObject = ${I.project} /* Project object */;
}
`;
}
