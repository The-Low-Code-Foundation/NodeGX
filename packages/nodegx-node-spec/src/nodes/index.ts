/**
 * The registry — every spec this package holds, keyed by catalog `typeName`.
 *
 * NSP-009's ledger counts this against the 147 picker nodes in the census
 * (dev-docs/tasks/phase-107-the-node-says-what-it-does/census.json).
 */

import type { AnyNodeSpec } from '../spec';
import { And } from './and';
import { Collection2 } from './array';
import { CollectionClear } from './array-clear';
import { FilterCollection } from './array-filter';
import { CollectionInsert } from './array-insert';
import { MapCollection } from './array-map';
import { CollectionNew } from './array-new';
import { CollectionRemove } from './array-remove';
import { BooleanVariable } from './boolean';
import { BooleanToString } from './boolean-to-string';
import { ColorVariable } from './color';
import { ColorBlend } from './color-blend';
import { Condition } from './condition';
import { Counter } from './counter';
import { DateAdd } from './date-add';
import { DateCompare } from './date-compare';
import { DateDifference } from './date-difference';
import { DateParts } from './date-parts';
import { DateToString } from './date-to-string';
import { Delay } from './delay';
import { Hash } from './hash';
import { Hmac } from './hmac';
import { JwtSign, JwtVerify } from './jwt';
import { Secret } from './secret';
import { SendEmail } from './send-email';
import { CloudRequest } from './cloud-request';
import { CloudResponse } from './cloud-response';
import { ModelRequest } from './model-request';
import { CreateUser, DeleteUser, UpdateUser, VerifySessionToken } from './system-users';
import { AddUserToRole, GetUserRoles, ListUsersInRole, RemoveUserFromRole } from './system-roles';
import { HttpRequest } from './http';
import { Inverter } from './inverter';
import { Log } from './log';
import { NewModel } from './new-object';
import { Now } from './now';
import { NumberVariable } from './number';
import { Model2 } from './object';
import { NumberRemapper } from './number-remapper';
import { Or } from './or';
import { ParseCSV } from './parse-csv';
import { ParseXML } from './parse-xml';
import { ParseFeed } from './parse-feed';
import { AnimateToValue } from './animate-to-value';
import { ScreenResolution } from './screen-resolution';
import { ExternalLink } from './external-link';
import { Button } from './button';
import { Checkbox } from './checkbox';
import { TextInput } from './text-input';
import { Dropdown } from './dropdown';
import { Slider } from './slider';
import { Icon } from './icon';
import { Text } from './text';
import { Group } from './group';
import { Circle } from './circle';
import { Image } from './image';
import { Video, OWN_ELEMENT } from './video';
import { Drag } from './drag';
import { ComponentStack } from './component-stack';
import { Repeater } from './repeater';
import { Columns } from './columns';
import { PageRouter } from './page-router';
import { RadioButtonGroup } from './radiobuttongroup';
import { RadioButton } from './radiobutton';
import { NavigateToPath } from './navigate-to-path';
import { PushComponentToStack } from './push-component-to-stack';
import { PopComponentStack } from './pop-component-stack';
import { RouterNavigate } from './router-navigate';
import { PageInputs } from './page-inputs';
import { ShowPopup } from './show-popup';
import { ClosePopup } from './close-popup';
import { DeleteRecord } from './delete-record';
import { AddRecordRelation, RemoveRecordRelation } from './record-relation';
import { CreateRecord } from './create-record';
import { UpdateRecord } from './update-record';
import { RecordNode } from './record';
import { QueryRecords } from './query-records';
import { FilterRecords } from './filter-records';
import { UserNode } from './user';
import { SetUserProperties } from './set-user-properties';
import { LogIn, LogOut, SignUp } from './user-actions';
import { RequestMagicLink, SignInWith } from './user-handovers';
import { CloudFile } from './cloud-file';
import { OpenFilePicker } from './open-file-picker';
import { CloudFunction } from './cloud-function';
import { SubscribeToChanges } from './subscribe-to-changes';
import { WebSocketNode } from './websocket';
import { ServerSentEvents } from './sse';
import { SignFileUrl, UploadFile } from './upload-file';
import { RandomBytes } from './random-bytes';
import { Repeat } from './repeat';
import { JSONStreamParser } from './json-stream-parser';
import { PatternExtractor } from './pattern-extractor';
import { TextAccumulator } from './text-accumulator';
import { StreamBuffer } from './stream-buffer';
import { SetModelProperties } from './set-object-properties';
import { SetVariable } from './set-variable';
import { StaticData } from './static-array';
import { States } from './states';
import { StringVariable } from './string';
import { StringFormat } from './string-format';
import { StringMapper } from './string-mapper';
import { Substring } from './substring';
import { Switch } from './switch';
import { ToCSV } from './to-csv';
import { UniqueId } from './unique-id';
import { Uuid } from './uuid';
import { ValueChanged } from './value-changed';
import { Variable2 } from './variable2';
import { Expression } from './expression';
import { JavaScriptFunction } from './function';
import { Script } from './script';
import { LogicBuilder } from './logic-builder';

export const specs: Readonly<Record<string, AnyNodeSpec>> = Object.freeze({
  // NSP-004 — the pilot five
  [Counter.type]: Counter,
  [Switch.type]: Switch,
  [And.type]: And,
  [Condition.type]: Condition,
  [StringFormat.type]: StringFormat,
  // NSP-011 — logic, math, strings, variables, converters
  [BooleanVariable.type]: BooleanVariable,
  [NumberVariable.type]: NumberVariable,
  [StringVariable.type]: StringVariable,
  [ColorVariable.type]: ColorVariable,
  [BooleanToString.type]: BooleanToString,
  [ColorBlend.type]: ColorBlend,
  [Inverter.type]: Inverter,
  [Log.type]: Log,
  [NumberRemapper.type]: NumberRemapper,
  [Or.type]: Or,
  [StringMapper.type]: StringMapper,
  [Substring.type]: Substring,
  [ValueChanged.type]: ValueChanged,
  // NSP-007 — the world: clock, randomness, network
  [Delay.type]: Delay,
  [Uuid.type]: Uuid,
  [HttpRequest.type]: HttpRequest,
  // NSP-012 — arrays, objects, variables, stores
  [Collection2.type]: Collection2,
  [CollectionNew.type]: CollectionNew,
  [CollectionClear.type]: CollectionClear,
  [CollectionInsert.type]: CollectionInsert,
  [CollectionRemove.type]: CollectionRemove,
  [FilterCollection.type]: FilterCollection,
  [MapCollection.type]: MapCollection,
  [Model2.type]: Model2,
  [NewModel.type]: NewModel,
  [SetModelProperties.type]: SetModelProperties,
  [StaticData.type]: StaticData,
  [Variable2.type]: Variable2,
  [SetVariable.type]: SetVariable,
  // NSP-013 — dates, time, randomness, parsers
  [DateAdd.type]: DateAdd,
  [DateCompare.type]: DateCompare,
  [DateDifference.type]: DateDifference,
  [DateParts.type]: DateParts,
  [DateToString.type]: DateToString,
  [Now.type]: Now,
  [Hash.type]: Hash,
  [RandomBytes.type]: RandomBytes,
  [UniqueId.type]: UniqueId,
  [ParseCSV.type]: ParseCSV,
  [ParseXML.type]: ParseXML,
  [ParseFeed.type]: ParseFeed,
  [AnimateToValue.type]: AnimateToValue,
  [ScreenResolution.type]: ScreenResolution,
  [ExternalLink.type]: ExternalLink,
  // NSP-016 — the visual nodes: logic, with each look and layout port's portability (R10); acted on by THE PERSON (spec.ts)
  [Button.type]: Button,
  [Checkbox.type]: Checkbox,
  [TextInput.type]: TextInput,
  [Dropdown.type]: Dropdown,
  [Slider.type]: Slider,
  [Icon.type]: Icon,
  [Text.type]: Text,
  [Group.type]: Group,
  [Circle.type]: Circle,
  [Image.type]: Image,
  [Video.type]: Video,
  [Drag.type]: Drag,
  [ComponentStack.type]: ComponentStack,
  [PageRouter.type]: PageRouter,
  [Repeater.type]: Repeater,
  [Columns.type]: Columns,
  [RadioButtonGroup.type]: RadioButtonGroup,
  [RadioButton.type]: RadioButton,
  [NavigateToPath.type]: NavigateToPath,
  [PushComponentToStack.type]: PushComponentToStack,
  [PopComponentStack.type]: PopComponentStack,
  [RouterNavigate.type]: RouterNavigate,
  [PageInputs.type]: PageInputs,
  [ShowPopup.type]: ShowPopup,
  [ClosePopup.type]: ClosePopup,
  // NSP-014 — records, users, files, HTTP (s21: the world's BACKEND seam)
  [DeleteRecord.type]: DeleteRecord,
  [AddRecordRelation.type]: AddRecordRelation,
  [RemoveRecordRelation.type]: RemoveRecordRelation,
  [CreateRecord.type]: CreateRecord, // s22
  [UpdateRecord.type]: UpdateRecord,
  [RecordNode.type]: RecordNode, // s23
  [QueryRecords.type]: QueryRecords,
  [FilterRecords.type]: FilterRecords, // s25
  [UserNode.type]: UserNode, // s26 (the world's AUTH seam)
  [SetUserProperties.type]: SetUserProperties,
  [LogIn.type]: LogIn, // s27
  [SignUp.type]: SignUp,
  [LogOut.type]: LogOut,
  [RequestMagicLink.type]: RequestMagicLink, // s28
  [SignInWith.type]: SignInWith,
  [CloudFile.type]: CloudFile, // s30 (the world's FILES)
  [UploadFile.type]: UploadFile,
  [SignFileUrl.type]: SignFileUrl,
  [OpenFilePicker.type]: OpenFilePicker, // s31 (the world's PICKER)
  [CloudFunction.type]: CloudFunction, // s32 (NETWORK's XHR face, PROJECT's cloud services)
  [SubscribeToChanges.type]: SubscribeToChanges, // s33 (BACKEND's REALTIME: a subscription told on the clock)
  [WebSocketNode.type]: WebSocketNode, // s34 (the world's SOCKET: a server script on the clock)
  [ServerSentEvents.type]: ServerSentEvents, // s34 (NETWORK's streamed body)
  [States.type]: States,
  [ToCSV.type]: ToCSV,
  [Repeat.type]: Repeat,
  [JSONStreamParser.type]: JSONStreamParser,
  [PatternExtractor.type]: PatternExtractor,
  [TextAccumulator.type]: TextAccumulator,
  [StreamBuffer.type]: StreamBuffer,
  // NSP-017 s64 — the escape hatches: the Expression, whose text is JavaScript the spec runs as the runtime does
  [Expression.type]: Expression,
  // NSP-017 s65 — the Function: a contract (the person's code is the behaviour), graded with one fixture per rule
  [JavaScriptFunction.type]: JavaScriptFunction,
  // NSP-017 s66 — the Script: a contract, its three ways of writing it, graded with one fixture per rule
  [Script.type]: Script,
  // NSP-017 s67 — the Visual Function: a contract — the blocks give the ports, the code they are written out as is the behaviour
  [LogicBuilder.type]: LogicBuilder,
  // NSP-022 s96 — the cloud-only nodes, graded on the runtime's cloud target: the keyed crypto (world.ts DIGEST, the keyed sign)
  [Hmac.type]: Hmac,
  [JwtSign.type]: JwtSign,
  [JwtVerify.type]: JwtVerify,
  // NSP-022 s96 — the backend process's services (world.ts HOST)
  [Secret.type]: Secret,
  [CreateUser.type]: CreateUser,
  [UpdateUser.type]: UpdateUser,
  [DeleteUser.type]: DeleteUser,
  [VerifySessionToken.type]: VerifySessionToken,
  [AddUserToRole.type]: AddUserToRole,
  [RemoveUserFromRole.type]: RemoveUserFromRole,
  [GetUserRoles.type]: GetUserRoles,
  [ListUsersInRole.type]: ListUsersInRole,
  [SendEmail.type]: SendEmail,
  // NSP-022 s97 — a function's first and last events (world.ts HOST, THE INVOCATION)
  [CloudRequest.type]: CloudRequest,
  [CloudResponse.type]: CloudResponse,
  // NSP-022 s98 — a model provider over NETWORK, its key from HOST `secrets`
  [ModelRequest.type]: ModelRequest
});

export { EQUIVALENT_MUTANTS } from './equivalent-mutants';
export { OWN_ELEMENT };
// NSP-016 s57 — the play's project a Page Router reads; a target builds the same
export { ROUTER_PAGES } from './page-router';
// NSP-016 s59 — the play's row templates a Repeater builds; a target registers the same
export { REPEATER_TEMPLATES, type RowTemplate } from './repeater';
// NSP-017 s65 — the Function's fixtures: one script per rule of its contract
export { FUNCTION_FIXTURES } from './function';
// NSP-017 s66 — the Script's fixtures
export { SCRIPT_FIXTURES } from './script';
// NSP-017 s67 — the Visual Function's fixtures: the blocks and the code written from them
export { LOGIC_BUILDER_FIXTURES } from './logic-builder';
// NSP-020 s85 (R19) — the types whose ports an editor may draw from the spec: graded by oracle (a), names complete
export { ADAPTER_GRADED_TYPES, DRAWN_PORT_TYPES } from './drawn-port-types';

export function specFor(typeName: string): AnyNodeSpec | undefined {
  return specs[typeName];
}

export {
  Hmac,
  Secret,
  CreateUser,
  UpdateUser,
  DeleteUser,
  VerifySessionToken,
  JwtSign,
  JwtVerify,
  And,
  Expression,
  JavaScriptFunction,
  Script,
  LogicBuilder,
  Collection2,
  CollectionClear,
  CollectionInsert,
  CollectionNew,
  CollectionRemove,
  FilterCollection,
  MapCollection,
  Model2,
  NewModel,
  SetModelProperties,
  SetVariable,
  StaticData,
  Variable2,
  BooleanToString,
  BooleanVariable,
  ColorBlend,
  ColorVariable,
  Condition,
  Counter,
  DateAdd,
  DateCompare,
  DateDifference,
  DateParts,
  DateToString,
  Delay,
  Hash,
  HttpRequest,
  Now,
  ParseCSV,
  ParseXML,
  ParseFeed,
  AnimateToValue,
  ScreenResolution,
  ExternalLink,
  Button,
  Checkbox,
  TextInput,
  Dropdown,
  Slider,
  Icon,
  Text,
  Group,
  Circle,
  Image,
  Video,
  Drag,
  ComponentStack,
  PageRouter,
  Repeater,
  Columns,
  RadioButtonGroup,
  RadioButton,
  NavigateToPath,
  PushComponentToStack,
  PopComponentStack,
  RouterNavigate,
  PageInputs,
  ShowPopup,
  ClosePopup,
  DeleteRecord,
  AddRecordRelation,
  RemoveRecordRelation,
  CreateRecord,
  UpdateRecord,
  RecordNode,
  QueryRecords,
  FilterRecords,
  UserNode,
  SetUserProperties,
  LogIn,
  SignUp,
  LogOut,
  RequestMagicLink,
  SignInWith,
  CloudFile,
  UploadFile,
  SignFileUrl,
  OpenFilePicker,
  CloudFunction,
  SubscribeToChanges,
  WebSocketNode,
  ServerSentEvents,
  States,
  RandomBytes,
  Repeat,
  JSONStreamParser,
  PatternExtractor,
  TextAccumulator,
  StreamBuffer,
  ToCSV,
  UniqueId,
  Inverter,
  Log,
  NumberRemapper,
  NumberVariable,
  Or,
  StringFormat,
  StringMapper,
  StringVariable,
  Substring,
  Switch,
  Uuid,
  ValueChanged
};
