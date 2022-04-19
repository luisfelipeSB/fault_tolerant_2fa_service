import 'dart:async';
import 'dart:convert';

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
  final _formKey = GlobalKey<FormState>();

  // Validate string format before contacting server
  bool _validatesecret(str) => ((str != null || str.isNotEmpty) &&
      str.length == 4 &&
      str.contains(RegExp(r'^[a-zA-Z0-9]+$')));

  // Check if setup code is valid with server, if so, persist secret
  Future<bool> _attemptEnable2fa(str) async {
    await Future.delayed(const Duration(seconds: 5));
    bool permitted = true;

    // Validate with server
    final client = RetryClient(http.Client());
    final url = Uri.parse('https://ourdomain.com/api/2fa/enable'); // TODO url
    try {
      var response = await client.put(url, body: {'secret': str});
      if (response.statusCode == 200) {}
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
                  if (!_validatesecret(str)) {
                    return 'Setup code invalid';
                  } else {
                    _str = str;
                    return null;
                  }
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
  static const int _period = 15;
  int _totp = 1000000;
  int _nexttotp = 0;
  int _counter = _period;

  @override
  void initState() {
    _getNewTOTP();
    Timer.periodic(const Duration(seconds: 1), (_) {
      _counter--;
      if (_counter == 5) _getNewTOTP();
      if (_counter <= 0) {
        _totp = _nexttotp;
        _counter = _period;
        print('secret (home): $secret');
      }
      setState(() {});
    });
    super.initState();
  }

  // Gets the next TOTP from the server
  void _getNewTOTP() async {
    final client = RetryClient(http.Client());
    final scrt = {'secret': secret};
    final url = Uri.http('https://ourdomain.com', '/api/2fa', scrt); // TODO url

    try {
      var response = await client.get(url);
      if (response.statusCode == 200) {
        _nexttotp = jsonDecode(response.body)['totp'];
      }
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
