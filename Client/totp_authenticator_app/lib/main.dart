import 'dart:async';
import 'dart:convert';
import 'dart:developer';
import 'package:cron/cron.dart';
import 'package:steel_crypt/steel_crypt.dart';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:http/retry.dart';

void main() => runApp(const MyApp());

String secret = '';

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  // Load secret from persistent storage, if any is stored
  Future<String> _loadsecret() async {
    final prefs = await SharedPreferences.getInstance();
    //await prefs.clear();//limpar cache
    secret = prefs.getString('secret') ?? '';
    //print('secret (init): $secret');
    return secret;
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<String>(
        future: _loadsecret(),
        builder: (BuildContext context, AsyncSnapshot<String> snapshot) {
          Widget home;
          if (snapshot.hasData && snapshot.data!.isNotEmpty) {
            home = const HomePage();
          } else {
            home = const SetupPage();
          }
          return MaterialApp(
            title: 'TOTP Authenticator App',
            theme: ThemeData(primarySwatch: Colors.green),
            home: home,
          );
        });
  }
}

class SetupPage extends StatefulWidget {
  const SetupPage({Key? key}) : super(key: key);

  @override
  State<SetupPage> createState() => _SetupPageState();
}

class _SetupPageState extends State<SetupPage> {
  static const String BASE_URI = 'https://twofaserverone.westeurope.cloudapp.azure.com';
  static const String BASE_URI2 = 'https://twofaserverone.westeurope.cloudapp.azure.com';
  final _formKey = GlobalKey<FormState>();

  // Validate string format before contacting server
  /*bool _validatesecret(str) => ((str != null || str.isNotEmpty) &&
      str.length == 4 &&
      str.contains(RegExp(r'^[a-zA-Z0-9]+$')));*/

  // Check if setup code is valid with server, if so, persist secret
  Future<bool> _attemptEnable2fa(str) async {
    await Future.delayed(const Duration(seconds: 5));
    bool permitted = false;

    // Validate with server
    final client = RetryClient(http.Client());
    final url = Uri.parse('$BASE_URI/api/totp/verifysecret'); // TODO url
    try {
      var response = await client.put(url, body: {'secretcode': str}).timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        log("update server1");
        permitted = true;
      } else {
            final url2 = Uri.parse('$BASE_URI2/api/totp/verifysecret'); // TODO url
             var response2 = await client.put(url, body: {'secretcode': str}).timeout(const Duration(seconds: 5));
            log("update server2");
            permitted = true;
      }     
    } on TimeoutException catch (e) {
    log('server 1 down');
    final url2 = Uri.parse('$BASE_URI2/api/totp/verifysecret'); // TODO url
            log("update server2");
            permitted = true;
  } on Error catch (e) {
    print('Error: $e');
  } finally {
      client.close();
    }

    // Persist secret
    if (permitted) {
      final prefs = await SharedPreferences.getInstance();
      if ((prefs.getString('secret') ?? '').isEmpty) {
        setState(() {
          prefs.setString('secret', str);
          secret = str;
        });
        return true;
      }
    }
    //print('secret (vald): $secret');
    return false;
  }

  @override
  Widget build(BuildContext context) {
    String? _str; // User inserted form string

    // Return setup page if code has not been inserted, or home page if it has
    if (secret.isNotEmpty) {
      //print('isnotempty');
      return const HomePage();
    }
    //print('isempty');
    return Scaffold(
      appBar: AppBar(title: const Text('Boogle Authenticator')),
      body: Form(
        key: _formKey,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Heading
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Text(
                'Setup 2FA',
                style: TextStyle(fontSize: 30, fontWeight: FontWeight.bold),
              ),
            ),

            // Form field
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: TextFormField(
                textAlign: TextAlign.center,
                validator: (str) {
                  /*if (!_validatesecret(str)) {
                    return 'Setup code invalid';
                  } else {*/
                    _str = str;
                    return null;
                  //}
                },
              ),
            ),

            // Submit button
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: ElevatedButton(
                onPressed: () {
                  if (_formKey.currentState!.validate()) {
                    //print('validated locally');
                    FutureBuilder<bool>(
                        future: _attemptEnable2fa(_str),
                        builder: (BuildContext context,
                            AsyncSnapshot<bool> snapshot) {
                          String message;
                          if (snapshot.hasData) {
                            if (snapshot.data == true) {
                              message = '2FA enabled';
                              Navigator.pushReplacement(
                                  context,
                                  MaterialPageRoute(
                                      builder: (context) => const HomePage()));
                            } else {
                              message = 'Invalid setup code';
                            }
                          } else if (snapshot.hasError) {
                            message = 'An error ocurred';
                          } else {
                            message = 'Verifying setup code';
                          }
                          return ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text(message))) as Widget;
                        });
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Invalid setup code')),
                    );
                  }
                },
                child: const Text('Submit'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({Key? key}) : super(key: key);

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  static const int _period = 30;
  String _totp = "";
  String _nextiv = "";
  String _nextkey = "";
  String _pasttotp = "";
  late String _nexttotp;
  int _counter = _period;
  int initialperiod = 0;

  final cron = Cron();

  static const String BASE_URI = 'https://twofaserverone.westeurope.cloudapp.azure.com';
  static const String BASE_URI2 = 'https://twofaservertwo.westeurope.cloudapp.azure.com';

  @override
  void initState() {
    _getNewTOTP();
    Future.delayed(const Duration(milliseconds: 2000), () {
    if(initialperiod > 30) {
    _counter = 60 - initialperiod;
    } else {
      _counter = 30 - initialperiod;
    }
    setState(() {
    // Here you can write your code for open new view
  });

});
    cron.schedule(Schedule.parse('*/30 * * * * *'), () async {
    _getNewTOTP();
    setState(() {});
  });
    Timer.periodic(const Duration(seconds: 1), (_) {
      _counter--;
      /*if (_counter == 5) _getNewTOTP();
      if (_counter <= 0) {
        _totp = _nexttotp;
        _counter = _period;
        print('secret (home): $secret');
      }*/
      setState(() {});
    });
    super.initState();
  }

  // Gets the next TOTP from the server
  void _getNewTOTP() async {
    final client = RetryClient(http.Client());
    final scrt = {'secret': secret};

    final url = Uri.parse('$BASE_URI/api/totp/secret/${scrt['secret']}/token'); // TODO url
    final url2 = Uri.parse('$BASE_URI2/api/totp/secret/${scrt['secret']}/token'); // TODO url

    try {
    var response = await client.get(url).timeout(const Duration(seconds: 5));


      log(response.statusCode.toString());

      if (response.statusCode == 200) {
          var encryptedData = jsonDecode(response.body)['user_token'];
          _nextiv = jsonDecode(response.body)['user_tokeniv'];
          _nextkey = jsonDecode(response.body)['user_tokenkey'];

          //log('_nexttotp: $_nexttotp');
          //log('_nextiv: $_nextiv');

      var key = _nextkey;
      var iv = _nextiv;
      var cypher = AesCrypt(key: key, padding: PaddingAES.pkcs7);
      _nexttotp = cypher.cbc.decrypt(enc: encryptedData, iv: iv);
      _pasttotp = _totp;
      if(_pasttotp == _nexttotp) {
        _totp = "server down...";
        _pasttotp = _totp;
      } else {
        _totp = _nexttotp;
      }
      _counter = _period;
        //log(_nexttotp);
        DateTime _now = DateTime.now();
        initialperiod = _now.second;

      log(cypher.cbc.decrypt(enc: encryptedData, iv: iv)); //decrypt

      } else {
      var response2 = await client.get(url2);
      log(response2.statusCode.toString());
      var encryptedData = jsonDecode(response2.body)['user_token'];
      _nextiv = jsonDecode(response2.body)['user_tokeniv'];
      _nextkey = jsonDecode(response2.body)['user_tokenkey'];

      var key = _nextkey;
      var iv = _nextiv;
      var cypher = AesCrypt(key: key, padding: PaddingAES.pkcs7);
      _nexttotp = cypher.cbc.decrypt(enc: encryptedData, iv: iv);
      _pasttotp = _totp;
      if(_pasttotp == _nexttotp) {
        _totp = "server down...";
        _pasttotp = _totp;
      } else {
        _totp = _nexttotp;
      }
  _counter = _period;

        DateTime _now = DateTime.now();
        initialperiod = _now.second;

        log(initialperiod.toString());

      log(cypher.cbc.decrypt(enc: encryptedData, iv: iv)); //decrypt
      
      }
      

    } on TimeoutException catch (e) {
    log('Server 1 down');
    var response2 = await client.get(url2);
      log(response2.statusCode.toString());
      var encryptedData = jsonDecode(response2.body)['user_token'];
      _nextiv = jsonDecode(response2.body)['user_tokeniv'];
      _nextkey = jsonDecode(response2.body)['user_tokenkey'];

      var key = _nextkey;
      var iv = _nextiv;
      var cypher = AesCrypt(key: key, padding: PaddingAES.pkcs7);
      _nexttotp = cypher.cbc.decrypt(enc: encryptedData, iv: iv);
      _pasttotp = _totp;
      if(_pasttotp == _nexttotp) {
        _totp = "serverdown";
        _pasttotp = _totp;
      } else {
        _totp = _nexttotp;
      }
      _counter = _period;

        DateTime _now = DateTime.now();
        initialperiod = _now.second;

         if(initialperiod > 30) {
    _counter = 60 - initialperiod +5;
    } else {
      _counter = 30 - initialperiod +5;
    }

        log(initialperiod.toString());

      log(cypher.cbc.decrypt(enc: encryptedData, iv: iv)); //decrypt
  } on Error catch (e) {
    log('Error: $e');
  } finally {
      client.close();
    }

    //_nexttotp = _totp - 1;
  }

  @override
  Widget build(BuildContext context) {
    // Display the TOTP and counter

    return Scaffold(
        appBar: AppBar(
          title: const Text('Boogle Authenticator'),
        ),
        body: Center(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              Text('$_totp     ', style: Theme.of(context).textTheme.headline4),
              Text('[$_counter]', style: Theme.of(context).textTheme.headline4),
            ],
          ),
        ));
  }
}



