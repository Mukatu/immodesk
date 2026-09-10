import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Saisie d'un code à 6 chiffres (OTP), une case par chiffre, avec
/// déplacement automatique du focus et gestion du collage d'un code
/// complet.
class OtpField extends StatefulWidget {
  const OtpField({
    super.key,
    required this.onChanged,
    this.onCompleted,
    this.errorText,
    this.length = 6,
    this.enabled = true,
  });

  final ValueChanged<String> onChanged;
  final ValueChanged<String>? onCompleted;
  final String? errorText;
  final int length;
  final bool enabled;

  @override
  State<OtpField> createState() => _OtpFieldState();
}

class _OtpFieldState extends State<OtpField> {
  late final List<TextEditingController> _controllers = List.generate(
    widget.length,
    (_) => TextEditingController(),
  );
  late final List<FocusNode> _focusNodes = List.generate(
    widget.length,
    (_) => FocusNode(),
  );

  @override
  void dispose() {
    for (final TextEditingController c in _controllers) {
      c.dispose();
    }
    for (final FocusNode f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  String get _code => _controllers.map((c) => c.text).join();

  void _handleChange(int index, String value) {
    if (value.length > 1) {
      final String digits = value.replaceAll(RegExp(r'[^0-9]'), '');
      for (int i = 0; i < _controllers.length; i++) {
        _controllers[i].text = i < digits.length ? digits[i] : '';
      }
      if (digits.length >= _controllers.length) {
        FocusScope.of(context).unfocus();
      }
      widget.onChanged(_code);
      if (_code.length == widget.length) widget.onCompleted?.call(_code);
      return;
    }

    if (value.isNotEmpty && index < widget.length - 1) {
      _focusNodes[index + 1].requestFocus();
    }
    if (value.isEmpty && index > 0) {
      _focusNodes[index - 1].requestFocus();
    }

    widget.onChanged(_code);
    if (_code.length == widget.length) {
      FocusScope.of(context).unfocus();
      widget.onCompleted?.call(_code);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: List<Widget>.generate(widget.length, (index) {
            return SizedBox(
              width: 44,
              child: TextField(
                key: ValueKey('otp-digit-$index'),
                controller: _controllers[index],
                focusNode: _focusNodes[index],
                enabled: widget.enabled,
                textAlign: TextAlign.center,
                keyboardType: TextInputType.number,
                maxLength: index == 0 ? widget.length : 1,
                inputFormatters: <TextInputFormatter>[
                  FilteringTextInputFormatter.digitsOnly,
                ],
                decoration: const InputDecoration(counterText: ''),
                style: Theme.of(context).textTheme.titleLarge,
                onChanged: (value) => _handleChange(index, value),
              ),
            );
          }),
        ),
        if (widget.errorText != null) ...[
          const SizedBox(height: 8),
          Text(
            widget.errorText!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        ],
      ],
    );
  }
}
