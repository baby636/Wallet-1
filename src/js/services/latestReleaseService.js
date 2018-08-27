'use strict';
angular.module('copayApp.services')
  .factory('latestReleaseService', function latestReleaseServiceFactory($log, $http, configService, platformInfo) {

    var root = {};

    root.checkLatestRelease = function(cb) {
      var releaseURL = configService.getDefaults().release.url;

      requestLatestRelease(releaseURL, function(err, releaseData) {
        if (err) return cb(err);
        var currentVersion = window.version;
        var latestVersion = releaseData.tag_name;

        if (!verifyTagFormat(currentVersion))
          return cb('Cannot verify the format of version tag: ' + currentVersion);
        if (!verifyTagFormat(latestVersion))
          return cb('Cannot verify the format of latest release tag: ' + latestVersion);

        var current = formatTagNumber(currentVersion);
        var latest = formatTagNumber(latestVersion);

        if (latest.major < current.major || (latest.major === current.major && latest.minor <= current.minor)) {
          return cb(null, false);
        }

        var releaseSearchTerm = "";
        if (platformInfo.isNW) { // XX SP: DESKTOP: Check if the latest release is already available for current OS
          var platform = process.platform;
          if (platform === "darwin") {
            releaseSearchTerm = "osx";
          } else if (platform === "win32") {
            releaseSearchTerm = "win";
          } else if (platform === "linux") {
            releaseSearchTerm = "linux";
          }
          var foundNewVersion = false;
          for (var i in releaseData.assets) {
            if (releaseData.assets[i].name.indexOf(releaseSearchTerm) !== -1) {
              foundNewVersion = true;
              break;
            }
          }
        }

        $log.debug('A new version is available: ' + latestVersion);

        //
        var releaseNotes = false;
        if (releaseData.body) {
          var releaseLines = releaseData.body.split('\n');
          for (var lineNum in releaseLines) {
            if (releaseLines[lineNum].substring(0, 2) === "# ") {
              releaseLines[lineNum] = "<strong>"+releaseLines[lineNum].substring(2)+"</strong>";
            } else if (releaseLines[lineNum].substring(0, 2) === "- ") {
              releaseLines[lineNum] = "&bull; "+releaseLines[lineNum].substring(2);
            }
          }
          releaseNotes = releaseLines.join('\n');
        }

        return cb(null, {latestVersion: latestVersion, releaseNotes: releaseNotes});
      });

      function verifyTagFormat(tag) {
        var regex = /^v?\d+\.\d+(\.\d+)?(-rc\d)?$/i;
        return regex.exec(tag);
      };

      function formatTagNumber(tag) {
        var label = false;
        if (tag.split("-")[1]) { // Move postfixes like "-rc2" to a variable
          label = tag.split("-")[1];
          tag = tag.split("-")[0];
        }

        var formattedNumber = tag.replace(/^v/i, '').split('.');
        return {
          major: +(formattedNumber[0]?+formattedNumber[0]:0),
          minor: +(formattedNumber[1]?+formattedNumber[1]:0),
          patch: +(formattedNumber[2]?+formattedNumber[2]:0),
          label: label /* XX SP: we can use this in a later stage (with for example 1.0.0-rc2 the value will be "rc2" and false if there is no label) */
        };
      };
    };

    function requestLatestRelease(releaseURL, cb) {
      $log.debug('Retrieving latest release information...');

      var request = {
        url: releaseURL,
        method: 'GET',
        json: true
      };

      $http(request).then(function(release) {
        $log.debug('Latest release: ' + release.data.name);
        return cb(null, release.data);
      }, function(err) {
        return cb('Cannot get the release information: ' + err);
      });
    };

    return root;
  });
